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

# Surpress spacy warnings
warnings.filterwarnings("ignore", category=UserWarning)

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
        
        self.notSkills(notSkills)

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

def extract_skills(corpus):
    '''
    Parses a string to extract resume skills

    Parameters:
        corpus (string): The extracted text of a resume

    Returns:
        skills (set): The extracted skills of the corpus
    '''
    stop_words = set(nltk.corpus.stopwords.words('english'))
    word_tokens = nltk.tokenize.word_tokenize(corpus)

    filtered_tokens = [ w for w in word_tokens if w not in stop_words ]
    filtered_tokens = [ w.lower() for w in word_tokens if w.isalpha() ]
    filtered_tokens = set(filtered_tokens)

    bitri = set(map(' '.join, nltk.everygrams(filtered_tokens, 2, 3)))

    skills = set()

    db = DatabaseInterface()

    with alive_bar(len(filtered_tokens), title="Parsing tokens...", bar="circles") as bar:
        for token in filtered_tokens:
            isSkill = db.isSkill(token)

            if isSkill == 1: skills.add(token)
            elif isSkill == 0:
                isSkill = apiCheck(token)
                if isSkill:
                    skills.add(token)
                    db.recordSkill(token)
                else: db.recordNotSkill(token)

            time.sleep(0.001)
            bar()

    db.close()

    return skills


@click.command()
@click.argument('resumeFile')
def cli(resumefile):
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

    skills = extract_skills(text) 
    
