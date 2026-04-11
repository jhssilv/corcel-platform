import os
import spacy
import spacy_udpipe

from app.logging_config import get_logger


logger = get_logger('app.task.tokenizer', source='task', task_module='text_task_logic')

class Tokenizer:
    def __init__(self):
        self._nlp = None

    def _load_resources(self):
        if self._nlp:
            return

        logger.info('Loading Spacy resources')

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

