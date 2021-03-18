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

# Placeeholder skills database
SKILLS = None
with open('data/skills.json', 'r') as f:
    SKILLS = json.load(f)
    f.close()

if SKILLS == None:
    raise ValueError("Unable to read in skills database")

SKILLS = set(SKILLS['skills'])


# Ensure that the needed NLTK packages are installed before running the parser
def systemPrep():
    nltk.data.path.append(f'{os.getcwd()}/env/nltk_data')
    nltk.download('punkt')
    nltk.download('averaged_perceptron_tagger')
    nltk.download('maxent_ne_chunker')
    nltk.download('words')

# Call skillAPI to check if a string is a skill recognized by the API
def checkSkill(skillname):
    req_url = f'https://api.promptapi.com/skills?q={skillname}&count=1'
    headers = { "apikey": '3fB6ppgySBe5rN3w2kA91f3qLRq8yINc' }
    response = requests.request('GET', req_url, headers=headers)
    res = response.json()

    if response.status_code == 200:
        return len(res) > 0 and res[0].lower() == skillname.lower()
    raise Exception(f"API Error: { res.get('message') }")

# Extract the text from the input document
def fetchTextPDF(filename):
    output_string = StringIO()
    with open(filename, 'rb') as f:
        parser = PDFParser(f)
        doc = PDFDocument(parser)
        rsrcmgr = PDFResourceManager()
        device = TextConverter(rsrcmgr, output_string, laparams=LAParams())
        interpreter = PDFPageInterpreter(rsrcmgr, device)
        for page in PDFPage.create_pages(doc):
            interpreter.process_page(page)

    return output_string.getvalue()

def fetchTextDocX(filename):
    return docx2txt.process(filename)

# PLACEHOLDER FUNCTION -- Responsible for loading in json file of known skills and known non-skill words
def openSkillsDB():
    with open( 'data/positiveSkills.json', 'r' ) as f:
        with open( 'data/nonSkills.json', 'r' ) as f2:
            knownSkills = json.load(f)
            nonSkills = json.load(f2)

            f2.close()

        f.close()

    return set(knownSkills), set(nonSkills) 

# PLACEHOLDER FUNCTION -- Responsible for closing json file of known skills and known non-skill words
def closeSkillsDB(knownSkills, nonSkills):
    knownSkills = list(knownSkills)
    nonSkills = list(nonSkills)
    with open( 'data/positiveSkills.json', 'w' ) as f:
        with open( 'data/nonSkills.json', 'w' ) as f2:
            json.dump(knownSkills, f)
            json.dump(nonSkills, f2)

            f2.close()

        f.close()

def checkIfInCorpus(word, obj):
    branch = obj[word[0]]  
    while not branch['leaf'] and branch[pos] < len(word):
        branch = branch['branch']

    return if word in branch['leaves']


# Meat of the script, parses a string to extract resume skills
def extract_skills(corpus, filename):
    stop_words = set(nltk.corpus.stopwords.words('english'))
    word_tokens = nltk.tokenize.word_tokenize(corpus)

    filtered_tokens = [ w for w in word_tokens if w not in stop_words ]
    filtered_tokens = [ w for w in word_tokens if w.isalpha() ]

    filtered_tokens = set(filtered_tokens)

    bitri = list(map(' '.join, nltk.everygrams(filtered_tokens, 2, 3)))
    skills = set()

    ks, ns = openSkillsDB()

    with alive_bar(len(filtered_tokens), title="Parsing tokens...", bar="circles") as bar:
        for token in filtered_tokens:

            bar()

            if token.lower() in ks:
                skills.add(token.lower())
            elif token.lower() in ns:
                continue
            elif token.lower() in SKILLS:
                ks.add(token.lower())
                skills.add(token.lower())
            elif checkSkill(token.lower()):
                ks.add(token.lower())
                skills.add(token.lower())
            else:
                ns.add(token.lower())
            time.sleep(0.0001)


    with alive_bar(len(bitri), title="Parsing bigrams and trigrams...", bar="circles") as bar:
        for ngram in bitri:

            bar()

            if ngram.lower() in ks:
                skills.add(ngram.lower())
            elif ngram.lower() in ns:
                continue
            elif ngram.lower() in SKILLS:
                 ks.add(ngram.lower())
                 skills.add(ngram.lower())
            elif checkSkill(ngram.lower()):
                ks.add(ngram.lower())
                skills.add(ngram.lower())
            else:
                ns.add(ngram.lower())
            time.sleep(0.0001)

    extraction_package_skills = ResumeParser(filename).get_extracted_data()['skills']
    for s in extraction_package_skills:
        skills.add(s.lower())

    closeSkillsDB(ks, ns)
    return skills

@click.command()
@click.argument('resumeFile')
def cli(resumefile):
    resumefileExt = resumefile.split('.')[-1].lower()

    text = None

    if resumefileExt == "pdf":
        text = fetchTextPDF(resumefile)
    elif resumefileExt == "docx":
        text = fetchTextDocX(resumefile)
    else:
        click.echo(f"ERROR: Unsupported filetype .{resumefileExt}")
        return

    if not text:
        click.echo(f"ERROR: Something went wrong, we're unable to extract your resume data")
        return

    skills = extract_skills(text, resumefile) 
    
    print(skills)
    # pprint.pprint(skills)

