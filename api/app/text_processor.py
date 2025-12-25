import os
import spacy
import spacy_udpipe
from hunspell import HunSpell
from spellchecker import SpellChecker
import requests
import json
import torch
from transformers import BertTokenizer, BertForMaskedLM
import numpy as np

def _get_resource_path(relative_path):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, relative_path)

def _download_dict():
    dict_url = "https://www.ime.usp.br/~pf/dicios/br-utf8.txt"
    txt_file_path = _get_resource_path('dicts/br-utf8.txt')
    json_file_path = _get_resource_path('dicts/br-utf8.json')
    data = {}

    if not os.path.exists(txt_file_path):
        print("Downloading dictionary...")
        r = requests.get(dict_url)
    
        with open(txt_file_path, "wb") as f:
            f.write(r.content)
            print("Download finished.")

    with open(txt_file_path, 'r', encoding='utf-8') as file:
        for index, line in enumerate(file, start=1):
            data[line.strip()] = 1 # removes blank spaces

    # conversion to json
    with open(json_file_path, 'w', encoding='utf-8') as json_file:
        json.dump(data, json_file, ensure_ascii=False, indent=4)

class TextProcessor():
    
    nlp = None
    hobj = None
    spell = None
    
    def __init__(self):
        
        dic_path = os.getenv('HUNSPELL_DIC', '/usr/share/hunspell/pt_BR.dic')
        aff_path = os.getenv('HUNSPELL_AFF', '/usr/share/hunspell/pt_BR.aff')
        
        hobj = HunSpell(dic_path, aff_path)

        _download_dict()
        os.makedirs(_get_resource_path('dicts/'), exist_ok=True)            

        sc_path = os.getenv('SPELLCHECKER_DICT', _get_resource_path('dicts/br-utf8.json'))
        spell = SpellChecker(local_dictionary=sc_path)

        spacy_udpipe.download("pt")
        
        nlp = spacy_udpipe.load('pt')
        nlp.tokenizer = spacy.blank("pt").tokenizer
        
        self.nlp = nlp
        self.hobj = hobj
        self.spell = spell
        
        self.bert_tokenizer = None
        self.bert_model = None
        self._load_bert()

    def _load_bert(self):
        print("Loading Bertimbau model...")
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"Using device: {self.device}")
        
        model_name = 'neuralmind/bert-base-portuguese-cased'
        self.bert_tokenizer = BertTokenizer.from_pretrained(model_name)
        self.bert_model = BertForMaskedLM.from_pretrained(model_name)
        self.bert_model.to(self.device)
        self.bert_model.eval()
        print("Bertimbau loaded.")

    def _is_valid_pt_word(self, word):
        return self.hobj.spell(word) or bool(self.spell.known([word]))

    def _get_bert_predictions(self, sentence_tokens, target_index, top_k=20):
        # Prepare input for BERT
        masked_tokens = sentence_tokens.copy()
        masked_tokens[target_index] = self.bert_tokenizer.mask_token
        
        text = " ".join(masked_tokens)
        inputs = self.bert_tokenizer(text, return_tensors="pt").to(self.device)
        
        with torch.no_grad():
            outputs = self.bert_model(**inputs)
            predictions = outputs.logits
            
        # Find the index of the masked token
        mask_token_indices = (inputs.input_ids == self.bert_tokenizer.mask_token_id)[0].nonzero(as_tuple=True)[0]
        
        if len(mask_token_indices) == 0:
            return []
            
        mask_index = mask_token_indices[0]
        
        # Get top k predictions
        probs = torch.nn.functional.softmax(predictions[0, mask_index], dim=-1)
        top_k_weights, top_k_indices = torch.topk(probs, top_k, sorted=True)
        
        results = []
        for i in range(top_k):
            token_id = top_k_indices[i].item()
            token = self.bert_tokenizer.decode([token_id]).strip()
            
            # Filter out subwords and special tokens
            if not token.startswith("##") and token not in ["[UNK]", "[PAD]", "[CLS]", "[SEP]", "[MASK]"] and token.isalpha():
                results.append(token)
            
        return results

    def _rank_by_bert(self, sentence_tokens, target_index, candidates, top_k=5):
        if not candidates:
            return []
        
        # Prepare input for BERT
        masked_tokens = sentence_tokens.copy()
        masked_tokens[target_index] = self.bert_tokenizer.mask_token
        
        text = " ".join(masked_tokens)
        inputs = self.bert_tokenizer(text, return_tensors="pt").to(self.device)
        
        with torch.no_grad():
            outputs = self.bert_model(**inputs)
            predictions = outputs.logits
            
        # Find the index of the masked token
        mask_token_indices = (inputs.input_ids == self.bert_tokenizer.mask_token_id)[0].nonzero(as_tuple=True)[0]
        
        if len(mask_token_indices) == 0:
            return candidates 
            
        mask_index = mask_token_indices[0]
        
        candidate_scores = []
        for candidate in candidates:
            candidate_ids = self.bert_tokenizer.encode(candidate, add_special_tokens=False)
            if len(candidate_ids) == 0:
                continue
            # Use the first token of the candidate for scoring
            candidate_id = candidate_ids[0]
            score = predictions[0, mask_index, candidate_id].item()
            candidate_scores.append((candidate, score))
            
        candidate_scores.sort(key=lambda x: x[1], reverse=True)
        return [c[0] for c in candidate_scores[:top_k]]

    def process_text(self, text: str):
        doc = self.nlp(text)
        results = {}
        sentence_tokens = [token.text for token in doc]

        for i, token in enumerate(doc):
            word = token.text
            
            if not word.isalpha():
                
                results[i] = {
                    'idx': i,
                    'text': word,
                    'to_be_normalized': False,
                    'suggestions': [],
                    'is_word': False,
                    'whitespace_after': token.whitespace_
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

            is_correct = self._is_valid_pt_word(word)
            
            bert_suggestions = []
            # If dictionary says incorrect, check with BERT for false positives
            if not is_correct:
                bert_preds = self._get_bert_predictions(sentence_tokens, i, top_k=50)
                # If the word (or a case variant) is in BERT's top predictions, consider it correct
                if word in bert_preds or word.lower() in [p.lower() for p in bert_preds]:
                    is_correct = True
                else:
                    # Get top 2 BERT suggestions that are not the word itself AND are valid PT words
                    for pred in bert_preds:
                        if pred.lower() != word.lower() and \
                           pred not in bert_suggestions and \
                           self._is_valid_pt_word(pred):
                            bert_suggestions.append(pred)
                            if len(bert_suggestions) >= 2:
                                break

            # BERT for context-aware ranking
            if not is_correct:
                if final_candidates:
                    sorted_suggestions = self._rank_by_bert(sentence_tokens, i, final_candidates, top_k=5)
                else:
                    sorted_suggestions = []
                
                # Add BERT suggestions to the top
                for bs in reversed(bert_suggestions):
                    if bs not in sorted_suggestions:
                        sorted_suggestions.insert(0, bs)
            else:
                sorted_suggestions = final_candidates[:7]
                
            results[i] = {
                'idx': i,
                'text': word,
                'to_be_normalized': not is_correct,
                'suggestions': sorted_suggestions,
                'is_word': True,
                'whitespace_after': token.whitespace_
            }

        return results

    """
    PSEUDOCODE EXPLANATION OF THE PIPELINE:

    1. Tokenization:
       - Input text is split into tokens using Spacy (Portuguese model).
       - Non-alphabetic tokens (punctuation, numbers) are skipped.

    2. Candidate Generation:
       - For each word, generate a list of candidate corrections using:
         a. HunSpell (morphological dictionary)
         b. SpellChecker (Levenshtein distance based)
       - Candidates are case-matched to the original word (e.g., "Word" -> "Candidate").

    3. Initial Correctness Check:
       - A word is considered "valid" if it exists in EITHER HunSpell OR SpellChecker dictionaries.

    4. False Positive Filtering:
       - If the word is flagged as INCORRECT by dictionaries:
         - Ask Bertimbau (BERT model) for the top 50 most probable words in that context.
         - If the original word (or a case variant) appears in BERT's predictions:
           -> Mark the word as CORRECT (assume dictionary is missing it, e.g., proper noun).
         - Else:
           -> Extract the top 2 suggestions from BERT that are:
              a. Not the original word.
              b. Valid Portuguese words (exist in dictionaries).
           -> Add these to a special "BERT suggestions" list.

    5. Ranking & Final Suggestions:
       - If the word is still INCORRECT:
         - Rank the dictionary candidates using BERT:
           -> Mask the word in the sentence.
           -> Calculate the probability of each candidate filling that mask.
         - Combine suggestions:
           -> [Top 2 BERT-generated suggestions] + [BERT-ranked dictionary candidates]
       - If the word is CORRECT:
         - Return the top 7 dictionary candidates, but mark `to_be_normalized` as False.

    6. Output:
       - Return a list of tokens with their status (correct/incorrect) and ranked suggestions.
    """

if __name__ == '__main__':
    processor = TextProcessor()
    text1 = """
        O processamento de linguagem natural é uma área fascinante da inteligência artificial.
        Muitas vezes, cometemos erros de digitação que podem ser corrigidos automaticamente.
        Por exemplo, se eu escrever "computador" como "conputador", o sistema deve sugerir a correção.
        Outro exemplo é a palavra "escessão", que deveria ser "exceção".
        A "sessão" de cinema estava lotada, mas a "seção" de brinquedos estava vazia.
        Vamos ver se ele consegue distinguir entre "concerto" (música) e "conserto" (reparo) pelo contexto.
        O músico fez um belo concerto no teatro.
        O mecânico fez o conserto do carro na oficina.
    """
    
    text2 = """
        20 de outubro de 2015, Belém
        Senhores,
        Prefeitura Municipal

        Assunto: Casarões históricos da cidade

        Atualmente nossa cidade vem sofrendo de roubos a grande parte da arquitetura dos casarões históricos da cidade, onde o foco municipal são os azulejos.
        Uma das construções depredadas por exemplo é o Palacete Vitor Maria da Silva.
        Além dessa construção tem outras que tem sido roubadas e causa preocupação devido que faz parte do património histórico, artistico e cultural. Muitos desses azulejos foram importados desde a Europa nos inícios do seculo XX e finais do XIX. Faz-se necessário que a prefeitura municipal tome medidas e sejam divulgadas Imediatamente para dar solução e parar tudo o que parece um mercado de azulejos na cidade.
        Proteger e investigar é dever também de toda a comunidade, mas principalmente depende das medidas que implementa a prefeitura Municipal.
         São Paulo - SP
    """
    
    text3 = """
        Actualmente, nossa ciudad vêm sufrendo de muita roubos de azuleijos.
        vandalos estam destruindo-nos lo patrimonio histórico.
        tenemos que tomar medidas inmediatas hasta protejer nostra cultura y historia.
    """

    text4 = """
        O problema e grande para mundo

        Necessidade renovar todos os idosos construção e vão limpar e organizar.

        O governo precisa fazer casas para Azulejos melhor que no Brasil e calor.

        O ministerio de saude precisa fazer todos os hospitalis gratis. Para Azulejos.

        Tambem o Ministerio do trabalho precisa resolver esse problema.

        Nos vamos ajudar com dinheiro ou com comida.

        eu acho que resoluar problema esse.
        
    """

    text5 = """
        Hola, tudo bem? Yo quero contar uma estória muito loca que aconteceu no fin de semana passada. Nós foi numa fiesta na casa do meu amigo, ele mora muito lejos da cidade, então pegamos o coche pra viajar. A estrada era muito larga e cansativa, cheia de buraco. Quando chegamos, a cena ainda não estava pronta e eu tinha muita fome, minha barriga doía.

        Decidi esperar um rato na sala, mas tinha muito polvo nos móveis e o chão estava sucio, parecia que não limpavam faz anos. Pedi um vaso de água pra moça, mas ela me trouxe um copo que parecia ter grasas. A comida quando veio estava muito salada, quase impossível de comer, e a carne estava crua e roja. Minha prima estava lá, ela está embarazada e passou mal com o cheiro forte da cozinha.

        Tinha uns homens muito borrachos fazendo barulho e brigando por causa de dinero e propina. Eu fiquei enojado com a situação toda. Todavía tentamos comer o pastel de sobremesa, mas tinha gosto de aceite velho. No final, saímos temprano porque ninguém aguentava mais aquilo. Foi um desastre total, pero fazer o que, né? A vida é assim as vezes.
        
    """

    import time
    print("Processing text...")
    start_time = time.time()
    results = processor.process_text(text4)
    end_time = time.time()
    
    total_time = end_time - start_time
    num_tokens = len(results)
    time_per_token = total_time / num_tokens if num_tokens > 0 else 0
    
    print(f"\nPerformance Metrics:")
    print(f"Total time: {total_time:.4f}s")
    print(f"Total tokens: {num_tokens}")
    print(f"Time per token: {time_per_token:.4f}s")
    
    print(f"\nText processed:\n{text4}")
    print("\nCorrections found:")
    for idx, data in results.items():
        if data['to_be_normalized']:
            print(f"Token {idx}: {data}")

