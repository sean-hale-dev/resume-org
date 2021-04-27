import json, os, pprint, time, warnings
import click, docx2txt, nltk, requests, pymongo, textract
from requests_threads import AsyncSession
from alive_progress import alive_bar 
from pyresparser import ResumeParser

# Surpress spacy warnings
warnings.filterwarnings("ignore", category=UserWarning)

session = AsyncSession(100)

UNKNOWNS = None

class DatabaseInterface:
    def __init__(self, skillsFilename="data/knownSkills.json", nonSkillsFilename="data/knownNonSkills.json"):
        mongoURI = os.environ["MONGO_URI"]
        self.dbClient = pymongo.MongoClient(mongoURI)
        self.skillsCollection = self.dbClient['resume_org']['resume_skills']

        self.skillsDocName = "skills"
        self.notSkillsDocName = "non_skills"

        self.skills = set(self._load_document(self.skillsDocName))
        self.notSkills = set(self._load_document(self.notSkillsDocName))
        
    def _load_document(self, documentKey):
        '''
        Loads in a BSON object from the MongoDB database

        Parameters:
            documentKey (string): The name of the document from the 'resume_skills' collection to load

        Returns:
            List/Dict: The parsed BSON obj into python struct
        '''
        retDoc = self.skillsCollection.find_one({"name": documentKey})

        if not retDoc:
            self.skillsCollection.insert_one({"name": documentKey, "lookup": ["$"]})
            return list()

        return retDoc['lookup']
    
    def _save_document(self, documentKey, obj):
        '''
        Serializes this class into the MongoDB database

        Parameters:
            documentKey (string): The name of the file to be written 
            obj (list): The object being recorded into the database
        '''
        retDoc = self.skillsCollection.find_one({"name": documentKey})

        if not retDoc:
            self.skillsCollection.insert_one({"name": documentKey, "lookup": ["$"]})
        else:
            self.skillsCollection.update_one({"name": documentKey}, {"$set": {"lookup": obj}})

    def isSkill(self, skill):
        '''
        Checks to see if a given skill is a skill known in our data 

        Parameters:
            skill (string): The skill being checked

        Returns:
            Int:
                0: This is an unknown term
                1: This is a known skill
                -1: This is a known non-skill
        '''

        if skill in self.skills: return 1
        elif skill in self.notSkills: return -1

        return 0

    def getUnknowns(self, tokenSet):
        '''
        Calculates the difference between the two set

        Parameters:
            tokenSet (set (string)): a set of potential skills

        Returns:
            set (string): All unknown skills
        '''
        return tokenSet.difference(self.skills).difference(self.notSkills)

    def getKnownSkills(self, tokenSet):
        '''
        Calculates the tokens in the set which are known skills

        Parameters:
            tokenSet (set(string)): a set of potential skills

        Returns:
            set (string): All known skills in this set
        '''
        return self.skills.intersection(tokenSet)


    def recordSkill(self, skill):
        '''
        Saves the skill into the self.skills

        Parameters:
            skill (string): The skill being saved
        '''

        self.skills.add(skill)

    def recordNotSkill(self, notSkill):
        '''
        Saves the non-skill into the self.notSkills

        Parameters:
            notSkill (string): The skill being saved
        '''
        
        self.notSkills.add(notSkill)

    def recordSkills(self, skills):
        '''
        Saves the skills into self.skills

        Parameters:
            skills (set(string)): The set of skills being added
        '''
        self.skills = self.skills.union(skills)

    def recordNotSkills(self, notSkills):
        '''
        Saves the skills into self.notSkills

        Parameters:
            notSkills (set(string)): The set of not skills being added
        '''
        self.notSkills = self.notSkills.union(notSkills)

    def close(self):
        '''
        Saves the internal data of this class
        '''
    
        self.skills = list(self.skills)
        self.notSkills = list(self.notSkills)

        self._save_document(self.skillsDocName, self.skills)
        self._save_document(self.notSkillsDocName, self.notSkills)

        self.dbClient.close()

# Ensure that the needed NLTK packages are installed before running the parser
def systemPrep():
    '''
    Optional function to collect necesary nltk libraries for this project
    '''
    nltk.data.path.append(f'{os.getcwd()}/env/nltk_data')
    nltk.download('stopwords')
    nltk.download('punkt')
    nltk.download('averaged_perceptron_tagger')
    nltk.download('maxent_ne_chunker')
    nltk.download('words')

async def asyncAPICheck():
    '''
    Use the UNKNOWNS global set as a set of skills to lookup via the promptapi Skills API
    
    This program will write confirmed skills back into UNKNOWNS global, excluding non-skills
    '''
    global UNKNOWNS
    skillset = UNKNOWNS
    deferResponses = {}
    responses = {}

    with alive_bar(len(skillset), title="Looking up tokens...", bar="circles") as bar:
        for skill in skillset:
            deferResponses[skill] = session.get(f"https://api.promptapi.com/skills?q={skill}&count=1", headers={"apikey": '3fB6ppgySBe5rN3w2kA91f3qLRq8yINc'})

        for skill, resp in deferResponses.items():
            response = await resp 
            if response.status_code == 200: responses[skill] = response.json()
            else: responses[skill] = None
            bar()

    ret = set()
    for skill, response in responses.items():
        if not response: continue

        if len(response) > 0 and response[0].lower() == skill.lower(): ret.add(skill)

    UNKNOWNS = ret

def extract_skills(corpus, filename):
    '''
    Parses a string to extract resume skills

    Parameters:
        corpus (string): The extracted text of a resume
        filename (string): The filepath to the resume being parsed

    Returns:
        skills (set): The extracted skills of the corpus
    '''
    global UNKNOWNS

    stop_words = set(nltk.corpus.stopwords.words('english'))
    word_tokens = nltk.tokenize.word_tokenize(corpus)

    filtered_tokens = [ w.lower() for w in word_tokens if w not in stop_words and w.isalpha() ]

    bitri = nltk.everygrams(filtered_tokens, 2, 3)
    filtered_tokens = set(filtered_tokens)
    for gram in bitri:
        gram = ' '.join(gram)
        gram = gram.lower()
        filtered_tokens.add(gram)

    db = DatabaseInterface()
    skills = db.getKnownSkills(filtered_tokens)
    unknown_skills = db.getUnknowns(filtered_tokens)
    UNKNOWNS = unknown_skills.copy()

    try:
        session.run(asyncAPICheck)
    except SystemExit:
        pass

    db.recordSkills(UNKNOWNS)
    db.recordNotSkills(unknown_skills.difference(UNKNOWNS))

    extraction_package_skills = set([elem.lower() for elem in ResumeParser(filename).get_extracted_data()['skills']])
    db.recordSkills(extraction_package_skills)

    skills = skills.union(extraction_package_skills)
    skills = skills.union(UNKNOWNS)

    db.close()

    return skills


@click.command()
@click.argument('resumeFile')
@click.option('--install', is_flag=True, help="Install NLTK packages required for operation", default=False)
def cli(resumefile, install):
    '''
    Entry point for the script, handles the read in and file extension detection for the input resume file.
    
    This is called via the resumeParser cli 

    Parameters:
        resumefile (string): Path to the input resume
    '''

    if install:
        systemPrep()
        return
        
    resumefileExt = resumefile.split('.')[-1].lower()

    text = textract.process(resumefile) 
    text = text.decode('utf-8')

    if not text:
        click.echo(f"ERROR: Something went wrong, we're unable to extract your resume data")
        return

    skills = list(extract_skills(text, resumefile))

    print(f"Finished tokenization and parsing -- Detected {len(skills)} skills:\n{skills}")

    with open(f"{resumefile}.json", "w+") as f:
        json.dump(skills, f)
        f.close()

if __name__ == "__main__":
    cli()
