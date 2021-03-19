from setuptools import setup

setup(
    name="resumeParser",
    version="0.1",
    py_modules=['resumeParser'],
    install_requires=[
        'click',
        'pdfminer.six',
        'pyresparser',
        'nltk',
        'requests',
        'spacy==2.3.5',
        'en_core_web_sm@https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-2.3.1/en_core_web_sm-2.3.1.tar.gz',
    ],
    entry_points='''
        [console_scripts]
        resumeParser=resumeParser:cli''',
)
