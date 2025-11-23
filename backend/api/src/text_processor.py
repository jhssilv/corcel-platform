import os
import spacy
import spacy_udpipe
from Levenshtein import distance
from hunspell import HunSpell
from spellchecker import SpellChecker

def _get_resource_path(relative_path):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, relative_path)

class TextProcessor():
    
    nlp = None
    hobj = None
    spell = None
    
    def __init__(self):
        
        dic_path = os.getenv('HUNSPELL_DIC', '/usr/share/hunspell/pt_BR.dic')
        aff_path = os.getenv('HUNSPELL_AFF', '/usr/share/hunspell/pt_BR.aff')
        
        hobj = HunSpell(dic_path, aff_path)

        sc_path = os.getenv('SPELLCHECKER_DICT', _get_resource_path('dicts/br-utf8.json'))
        spell = SpellChecker(local_dictionary=sc_path)

        spacy_udpipe.download("pt")
        
        nlp = spacy_udpipe.load('pt')
        nlp.tokenizer = spacy.blank("pt").tokenizer
        
        self.nlp = nlp
        self.hobj = hobj
        self.spell = spell
        

    def _rank_by_levenshtein(self, original_word, candidates, top_k=10):
        if not candidates:
            return []
        
        sorted_candidates = sorted(
            list(candidates),
            key=lambda c: distance(original_word.lower(), c.lower())
        )
        return sorted_candidates[:top_k]

    def process_text(self, text: str):
        doc = self.nlp(text)
        results = {}

        for i, token in enumerate(doc):
            word = token.text
            
            if not word.isalpha():
                
                results[i] = {
                    'idx': i,
                    'text': word,
                    'to_be_normalized': False,
                    'suggestions': [],
                    'whitespace_after': token.whitespace_ == ' '
                }
                continue

            candidates = set()
            candidates.update(self.spell.candidates(word) or [])
            try:
                candidates.update(self.hobj.suggest(word))
            except: pass

            if word in candidates:
                candidates.remove(word)

            final_candidates = []
            temp_candidates = [c.capitalize() if word[0].isupper() else c.lower() for c in candidates]
            
            for c in temp_candidates:
                if word.isupper():
                    final_candidates.append(c.upper())
                elif word[0].isupper():
                    final_candidates.append(c.capitalize())
                else:
                    final_candidates.append(c.lower())

            is_correct = self.hobj.spell(word)
            
            sorted_suggestions = self._rank_by_levenshtein(word, final_candidates)
                
            results[i] = {
                'idx': i,
                'text': word,
                'to_be_normalized': not is_correct,
                'suggestions': sorted_suggestions,
                'whitespace_after': token.whitespace_
            }

        return results