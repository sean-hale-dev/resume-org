from io import StringIO
from pdfminer.converter import TextConverter
from pdfminer.layout import LAParams
from pdfminer.pdfdocument import PDFDocument
from pdfminer.pdfinterp import PDFResourceManager, PDFPageInterpreter
from pdfminer.pdfpage import PDFPage
from pdfminer.pdfparser import PDFParser

import nltk
import os

# Placeeholder skills database
SKILLS = [
            "machine learning",
            "nlp",
            "python"
        ]

# Ensure that the needed NLTK packages are installed before running the parser
def systemPrep():
    nltk.data.path.append(f'{os.getcwd()}/env/nltk_data')
    nltk.download('punkt')
    nltk.download('averaged_perceptron_tagger')
    nltk.download('maxent_ne_chunker')
    nltk.download('words')

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

# Meat of the script, parses a string to extract resume skills
def extract_skills(corpus):
    stop_words = set(nltk.corpus.stopwords.words('english'))
    word_tokens = nltk.tokenize.word_tokenize(corpus)

    filtered_tokens = [ w for w in word_tokens if w not in stop_words ]
    filtered_tokens = [ w for w in word_tokens if w.isalpha() ]

    bitri = list(map(' '.join, nltk.everygrams(filtered_tokens, 2, 3)))
    skills = set()

    for token in filtered_tokens:
        if token.lower() in SKILLS:
            skills.add(token.lower())

    for ngram in bitri:
        if ngram.lower() in SKILLS:
            skills.add(ngram.lower())

    print( skills )
    return skills

if __name__ == "__main__":
    systemPrep()
    # fetchText(input("Enter resume file path\n"))
    resumeText = fetchText('test_resumes/Sean College Resume.pdf')
    extract_skills(resumeText)
