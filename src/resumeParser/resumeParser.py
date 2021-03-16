from io import StringIO
from pdfminer.converter import TextConverter
from pdfminer.layout import LAParams
from pdfminer.pdfdocument import PDFDocument
from pdfminer.pdfinterp import PDFResourceManager, PDFPageInterpreter
from pdfminer.pdfpage import PDFPage
from pdfminer.pdfparser import PDFParser

import nltk
import os
import json
import requests

SKILLS = None
# Placeeholder skills database
with open('data/skills.json', 'r') as f:
    SKILLS = json.load(f)
    f.close()

if SKILLS == None:
    raise ValueError("Unable to read in skills database")

SKILLS = SKILLS['skills']


# Ensure that the needed NLTK packages are installed before running the parser
def systemPrep():
    nltk.data.path.append(f'{os.getcwd()}/env/nltk_data')
    nltk.download('punkt')
    nltk.download('averaged_perceptron_tagger')
    nltk.download('maxent_ne_chunker')
    nltk.download('words')

def checkSkill(skillname):
    req_url = f'https://api.promptapi.com/skills?q={skillname}&count=1'
    headers = { "apikey": '3fB6ppgySBe5rN3w2kA91f3qLRq8yINc' }
    response = requests.request('GET', req_url, headers=headers)
    res = response.json()

    if response.status_code == 200:
        return len(res) > 0 and res[0].lower() == skillname.lower()
    raise Exception(f"API Error: { res.get('message') }")

# Extract the text from the input document
def fetchText(filename):
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

def openSkillsDB():
    with open( 'data/positiveSkills.json', 'r' ) as f:
        with open( 'data/nonSkills.json', 'r' ) as f2:
            knownSkills = json.load(f)
            nonSkills = json.load(f2)

            f2.close()

        f.close()

    return knownSkills, nonSkills

def closeSkillsDB(knownSkills, nonSkills):
    with open( 'data/positiveSkills.json', 'w' ) as f:
        with open( 'data/nonSkills.json', 'w' ) as f2:
            json.dump(knownSkills, f)
            json.dump(nonSkills, f2)

            f2.close()

        f.close()


# Meat of the script, parses a string to extract resume skills
def extract_skills(corpus):
    stop_words = set(nltk.corpus.stopwords.words('english'))
    word_tokens = nltk.tokenize.word_tokenize(corpus)

    filtered_tokens = [ w for w in word_tokens if w not in stop_words ]
    filtered_tokens = [ w for w in word_tokens if w.isalpha() ]

    bitri = list(map(' '.join, nltk.everygrams(filtered_tokens, 2, 3)))
    skills = set()

    ks, ns = openSkillsDB()

    for token in filtered_tokens:
        if token.lower() in ks:
            skills.add(token.lower())
        elif token.lower() in ns:
            continue
        elif token.lower() in SKILLS:
            ks.append(token.lower())
            skills.add(token.lower())
        elif checkSkill(token.lower()):
            ks.append(token.lower())
            skills.add(token.lower())
        else:
            ns.append(token.lower())

    for ngram in bitri:
        if ngram.lower() in ks:
            skills.add(ngram.lower())
        elif ngram.lower() in ns:
            continue
        elif ngram.lower() in SKILLS:
             ks.append(ngram.lower())
             skills.add(ngram.lower())
        elif checkSkill(ngram.lower()):
            ks.append(ngram.lower())
            skills.add(ngram.lower())
        else:
            ns.append(ngram.lower())

    print( skills )

    closeSkillsDB(ks, ns)
    return skills

if __name__ == "__main__":
    systemPrep()
    # fetchText(input("Enter resume file path\n"))
    resumeText = fetchText('test_resumes/Sean College Resume.pdf')
    extract_skills(resumeText)
