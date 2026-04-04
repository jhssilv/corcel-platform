
import os
import spacy
import spacy_udpipe
from hunspell import HunSpell
from spellchecker import SpellChecker
import requests
import json

from app.logging_config import get_logger


logger = get_logger('app.task.tokenizer', source='task', task_module='text_task_logic')

def _get_resource_path(relative_path):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, relative_path)

def _download_dict():
    dict_url = "https://www.ime.usp.br/~pf/dicios/br-utf8.txt"
    txt_file_path = _get_resource_path('dicts/br-utf8.txt')
    json_file_path = _get_resource_path('dicts/br-utf8.json')
    data = {}

    if not os.path.exists(txt_file_path):
        logger.info('Downloading tokenizer dictionary')
        try:
            r = requests.get(dict_url)
            with open(txt_file_path, "wb") as f:
                f.write(r.content)
            logger.info('Tokenizer dictionary download finished')
        except Exception as e:
            logger.exception('Error downloading tokenizer dictionary', extra={'event': {'error': str(e)}})
            return

    if not os.path.exists(json_file_path):
        logger.info('Converting tokenizer dictionary to JSON')
        with open(txt_file_path, 'r', encoding='utf-8') as file:
            for index, line in enumerate(file, start=1):
                data[line.strip()] = 1 # removes blank spaces

        # conversion to json
        with open(json_file_path, 'w', encoding='utf-8') as json_file:
            json.dump(data, json_file, ensure_ascii=False, indent=4)
        logger.info('Tokenizer JSON dictionary created')

class Tokenizer:
    def __init__(self):
        self._nlp = None
        self._hobj = None
        self._spell = None

    def _load_resources(self):
        if self._nlp:
            return

        logger.info('Loading Spacy/Hunspell resources')
        dic_path = os.getenv('HUNSPELL_DIC', '/usr/share/hunspell/pt_BR.dic')
        aff_path = os.getenv('HUNSPELL_AFF', '/usr/share/hunspell/pt_BR.aff')
        
        try:
            self._hobj = HunSpell(dic_path, aff_path)
        except Exception as e:
            logger.exception('Hunspell load error', extra={'event': {'error': str(e)}})

        _download_dict()
        os.makedirs(_get_resource_path('dicts/'), exist_ok=True)            

        sc_path = os.getenv('SPELLCHECKER_DICT', _get_resource_path('dicts/br-utf8.json'))
        self._spell = SpellChecker(language=None, local_dictionary=sc_path)

        try:
            spacy_udpipe.download("pt")
            nlp = spacy_udpipe.load('pt')
            nlp.tokenizer = spacy.blank("pt").tokenizer
            self._nlp = nlp
        except Exception as e:
            logger.exception('spaCy resource load error', extra={'event': {'error': str(e)}})
            
        logger.info('Tokenizer resources loaded')

    @property
    def nlp(self):
        if self._nlp is None:
            self._load_resources()
        return self._nlp

    @property
    def hobj(self):
        if self._hobj is None:
            self._load_resources()
        return self._hobj

    @property
    def spell(self):
        if self._spell is None:
            self._load_resources()
        return self._spell

    def _is_valid_pt_word(self, word):
        if not self.hobj: return False
        return self.hobj.spell(word) or bool(self.spell.known([word]))

    def tokenize_only(self, text: str):
        """
        Tokenizes the text without performing spell checking or normalization suggestions.
        """
        doc = self.nlp(text)
        results = {}

        for i, token in enumerate(doc):
            word = token.text
            is_word = word.isalpha()
            
            results[i] = {
                'idx': i,
                'text': word,
                'to_be_normalized': False,
                'suggestions': [],
                'is_word': is_word,
                'whitespace_after': token.whitespace_
            }
        
        return results

