from pdfminer.converter import TextConverter
from pdfminer.layout import LAParams
from pdfminer.pdfdocument import PDFDocument
from pdfminer.pdfinterp import PDFResourceManager, PDFPageInterpreter
from pdfminer.pdfpage import PDFPage
from pdfminer.pdfparser import PDFParser
from io import StringIO
from alive_progress import alive_bar
from pyresparser import ResumeParser

import json, os, pprint, time, warnings
import click, docx2txt, nltk, requests
from requests_threads import AsyncSession

# Surpress spacy warnings
warnings.filterwarnings("ignore", category=UserWarning)

session = AsyncSession(100)

class DatabaseInterface:
    def __init__(self, skillsFilename="data/knownSkills.json", nonSkillsFilename="data/knownNonSkills.json"):
        self.skillsFName = skillsFilename
        self.notSkillsFName = nonSkillsFilename

        self.skills = set(self._load_file(self.skillsFName))
        self.notSkills = set(self._load_file(self.notSkillsFName))

    def _load_file(self, filename):
        '''
        Loads in a JSON object from a file

        Parameters:
            filename (string): The name of the file to be loaded

        Returns:
            List/Dict: The parsed JSON obj into python struct
        '''
        with open(filename, 'r') as f:
            ret = json.load(f)
            f.close()
        return ret
    
    def _save_file(self, filename, obj):
        '''
        Serializes this class into a file essentially

        Parameters:
            filename (string): The name of the file to be written 

        Returns:
            List/Dict: The parsed JSON obj into python struct
        '''

        with open(filename, 'w') as f:
            json.dump(obj, f, indent=4)

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

    def close(self):
        '''
        Saves the internal data of this class
        '''
    
        self.skills = list(self.skills)
        self.notSkills = list(self.notSkills)

        self._save_file(self.skillsFName, self.skills)
        self._save_file(self.notSkillsFName, self.notSkills)



# Ensure that the needed NLTK packages are installed before running the parser
def systemPrep():
    '''
    Optional function to collect necesary nltk libraries for this project
    '''
    nltk.data.path.append(f'{os.getcwd()}/env/nltk_data')
    nltk.download('punkt')
    nltk.download('averaged_perceptron_tagger')
    nltk.download('maxent_ne_chunker')
    nltk.download('words')

def apiCheck(skillname):
    '''
    Call skillAPI to check if a string is a skill recognized by the API

    Parameters:
        skillname (string): Skill being checked by the API

    Returns:
        Boolean: 
            True: The API recognized the word as a skill
            False: The API did not recognize the word as a skill

    '''
    req_url = f'https://api.promptapi.com/skills?q={skillname}&count=1'
    headers = { "apikey": '3fB6ppgySBe5rN3w2kA91f3qLRq8yINc' }
    response = requests.request('GET', req_url, headers=headers)
    res = response.json()

    if response.status_code == 200:
        return len(res) > 0 and res[0].lower() == skillname.lower()
    raise Exception(f"API Error: { res.get('message') }")

async def asyncAPICheck(skillset):
    responses = []
    for skill in skillset:
        responses.append(await session.get(f"https://api.promptapi.com/skills?q={skill}&count=1", headers={"apikey": '3fB6ppgySBe5rN3w2kA91f3qLRq8yINc'}))

    for response in responses:
        response = yield response
        print(response)

# Extract the text from the input document
def fetchTextPDF(filename):
    '''
    Extract text from a pdf document

    Parameters:
        filename (string): The PDF document to extract text from

    Returns:
        String: The extracted text
    '''
    output_string = StringIO()
    with open(filename, 'rb') as f:
        parser = PDFParser(f)
        doc = PDFDocument(parser)
        rsrcmgr = PDFResourceManager()
        device = TextConverter(rsrcmgr, output_string, laparams=LAParams())
        interpreter = PDFPageInterpreter(rsrcmgr, device)
        for page in PDFPage.create_pages(doc):
            interpreter.process_page(page)

    return str(output_string.getvalue())

def fetchTextDocX(filename):
    '''
    Extract text from a docx document

    Parameters:
        filename (string): The docx document to extract text from

    Returns:
        String: The extracted text
    '''

    return docx2txt.process(filename)

def extract_skills(corpus, filename):
    '''
    Parses a string to extract resume skills

    Parameters:
        corpus (string): The extracted text of a resume
        filename (string): The filepath to the resume being parsed

    Returns:
        skills (set): The extracted skills of the corpus
    '''
    stop_words = set(nltk.corpus.stopwords.words('english'))
    word_tokens = nltk.tokenize.word_tokenize(corpus)

    filtered_tokens = [ w for w in word_tokens if w not in stop_words ]
    filtered_tokens = [ w.lower() for w in word_tokens if w.isalpha() ]

    bitri = nltk.everygrams(filtered_tokens, 2, 3)
    filtered_tokens = set(filtered_tokens)
    for gram in bitri:
        gram = ' '.join(gram)
        gram = gram.lower()
        filtered_tokens.add(gram)

    db = DatabaseInterface()
    skills = db.getKnownSkills(filtered_tokens)
    unknowns = db.getUnknowns(filtered_tokens)

    session.run(asyncAPICheck, unknowns)


    # with alive_bar(len(unknowns), title="Parsing tokens...", bar="circles") as bar:
    #     for token in unknowns:
    #         if apiCheck(token):
    #             skills.add(token)
    #             db.recordSkill(token)
    #         else: db.recordNotSkill(token)

    #         time.sleep(0.001)
    #         bar()

    # extraction_package_skills = set([elem.lower() for elem in ResumeParser(filename).get_extracted_data()['skills']])

    skills = skills.union(extraction_package_skills)

    for s in extraction_package_skills:
        db.recordSkill(s)

    db.close()

    return skills


@click.command()
@click.argument('resumeFile')
def cli(resumefile):
    '''
    Entry point for the script, handles the read in and file extension detection for the input resume file.
    
    This is called via the resumeParser cli 

    Parameters:
        resumefile (string): Path to the input resume
    '''
    resumefileExt = resumefile.split('.')[-1].lower()

    text = None

    if resumefileExt == "pdf": text = fetchTextPDF(resumefile)
    elif resumefileExt == "docx": text = fetchTextDocX(resumefile)
    else:
        click.echo(f"ERROR: Unsupported filetype .{resumefileExt}")
        return

    if not text:
        click.echo(f"ERROR: Something went wrong, we're unable to extract your resume data")
        return

    skills = extract_skills(text, resumefile) 

    print(f"Finished tokenization and parsing -- Detected {len(skills)} skills:\n{skills}")

