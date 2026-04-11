import json
import os
import time
import re
import requests

from hunspell import HunSpell
from spellchecker import SpellChecker

from .logging_config import get_logger

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = "gemma3:4b"
OLLAMA_MIN_CTX = int(os.getenv("OLLAMA_MIN_CTX", "1024"))
OLLAMA_MAX_CTX = int(os.getenv("OLLAMA_MAX_CTX", "8192"))

logger = get_logger('app.task.text_processor', source='task', task_module='text_task_logic')

def _get_resource_path(relative_path):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, relative_path)

def _download_dict():
    dict_url = "https://www.ime.usp.br/~pf/dicios/br-utf8.txt"
    txt_file_path = _get_resource_path('dicts/br-utf8.txt')
    json_file_path = _get_resource_path('dicts/br-utf8.json')
    data = {}

    if not os.path.exists(txt_file_path):
        logger.info('Downloading text_processor dictionary')
        try:
            r = requests.get(dict_url)
            with open(txt_file_path, "wb") as f:
                f.write(r.content)
            logger.info('Text Processor dictionary download finished')
        except Exception as e:
            logger.exception('Error downloading dictionary', extra={'event': {'error': str(e)}})
            return

    if not os.path.exists(json_file_path):
        logger.info('Converting text_processor dictionary to JSON')
        with open(txt_file_path, 'r', encoding='utf-8') as file:
            for index, line in enumerate(file, start=1):
                data[line.strip()] = 1 # removes blank spaces

        # conversion to json
        with open(json_file_path, 'w', encoding='utf-8') as json_file:
            json.dump(data, json_file, ensure_ascii=False, indent=4)
        logger.info('Text Processor JSON dictionary created')


class TextProcessor:

    def __init__(self, model: str = OLLAMA_MODEL, ollama_url: str = OLLAMA_BASE_URL):
        self._hobj = None
        self._spell = None
        self.model = model
        self.ollama_url = ollama_url.rstrip("/")

    def _load_resources(self):
        if self._hobj is not None:
            return

        logger.info('Loading Hunspell resources')
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

    # ------------------------------------------------------------------
    # Ollama helpers
    # ------------------------------------------------------------------

    def _estimate_token_count(self, text: str) -> int:
        # Heuristic estimate to avoid expensive tokenization calls on each request.
        if not text:
            return 0

        char_estimate = (len(text) + 3) // 4
        word_estimate = len(re.findall(r"\S+", text))
        return max(char_estimate, word_estimate)

    def _compute_context_size(self, prompt: str, source_text: str) -> int:
        prompt_tokens = self._estimate_token_count(prompt)

        source_tokens = self._estimate_token_count(source_text)
        estimated_output_tokens = 96 + min(512, int(source_tokens * 1.8))

        estimated_total = int((prompt_tokens + estimated_output_tokens) * 1.15)
        estimated_total = max(OLLAMA_MIN_CTX, estimated_total)

        if OLLAMA_MAX_CTX < OLLAMA_MIN_CTX:
            return estimated_total

        return min(estimated_total, OLLAMA_MAX_CTX)

    def _ollama_generate(self, prompt: str, temperature: float = 0.1, num_ctx: int | None = None) -> str:
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
            },
        }
        if num_ctx is not None:
            payload["options"]["num_ctx"] = num_ctx

        resp = requests.post(
            f"{self.ollama_url}/api/generate",
            json=payload,
            timeout=120,
        )
        resp.raise_for_status()
        return resp.json().get("response", "")

    def _build_prompt(self, text: str) -> str:
        return (
            "Você é um corretor ortográfico de português brasileiro.\n"
            "Analise o texto abaixo e identifique TODAS as palavras escritas "
            "de forma incorreta, com erros ortográficos ou que não pertencem "
            "ao português padrão (incluindo palavras estrangeiras.\n\n"
            "Para CADA palavra incorreta, forneça:\n"
            '  - "word": a palavra exatamente como aparece no texto\n'
            '  - "suggestions": lista de até 5 sugestões de correção, '
            "ordenadas da mais provável para a menos provável\n\n"
            "Regras:\n"
            "- NÃO inclua palavras corretas.\n"
            "- NÃO altere nomes próprios, siglas ou abreviações.\n"
            "- Mantenha a capitalização original na chave 'word'.\n"
            "- Responda APENAS com um JSON array, sem texto adicional.\n\n"
            "Texto:\n"
            f'"""\n{text}\n"""\n\n'
            "Resposta (JSON array):"
        )

    def _parse_llm_response(self, raw: str) -> dict[str, list[str]]:
        text = raw.strip()

        if text.startswith("```"):
            lines = text.splitlines()
            lines = [l for l in lines if not l.strip().startswith("```")]
            text = "\n".join(lines).strip()

        try:
            items = json.loads(text)
        except json.JSONDecodeError:
            start = text.find("[")
            end = text.rfind("]")
            if start != -1 and end != -1:
                try:
                    items = json.loads(text[start : end + 1])
                except json.JSONDecodeError:
                    print(f"[LLM] Failed to parse response:\n{raw[:500]}")
                    return {}
            else:
                print(f"[LLM] No JSON array found in response:\n{raw[:500]}")
                return {}

        result: dict[str, list[str]] = {}
        for entry in items:
            if not isinstance(entry, dict):
                continue
            word = entry.get("word", "")
            suggestions = entry.get("suggestions", [])
            if word:
                result[word.lower()] = [s for s in suggestions if isinstance(s, str)]
        return result

    def _get_llm_corrections(self, text: str) -> dict[str, list[str]]:
        prompt = self._build_prompt(text)
        num_ctx = self._compute_context_size(prompt, text)
        logger.info(
            'LLM request context estimated',
            extra={
                'event': {
                    'model': self.model,
                    'estimated_prompt_tokens': self._estimate_token_count(prompt),
                    'estimated_source_tokens': self._estimate_token_count(text),
                    'num_ctx': num_ctx,
                }
            },
        )
        raw = self._ollama_generate(prompt, num_ctx=num_ctx)
        return self._parse_llm_response(raw)

    def process_tokens(self, tokens: list[dict], text: str, llm_assists_detection: bool = True):
        """
        Full processing pipeline:
          1. Generate dictionary candidates (Hunspell + SpellChecker) for valid words.
          2. Ask the LLM (single call) which tokens are incorrect and
             get its suggestions.
          3. Merge dictionary candidates with LLM suggestions (LLM first).
          4. Return token dict with to_be_normalized flags and suggestions.

        Args:
            tokens: A list of token dictionaries containing 'idx', 'text', 'is_word', and 'whitespace_after'.
            text: The full original text string for LLM context.
            llm_assists_detection: If True (default), the LLM helps decide
                whether a word is incorrect (can override dictionary results).
                If False, only dictionaries determine correctness; the LLM
                still provides suggestions for words flagged by dictionaries.
        """
        start_time = time.perf_counter()
        logger.info(
            'Text processing started',
            extra={
                'event': {
                    'status': 'started',
                    'token_count': len(tokens),
                    'llm_assists_detection': llm_assists_detection,
                }
            },
        )

        try:
            results = {}

            # --- Phase 1: dictionary candidate generation per token -----------
            token_candidates: dict[int, list[str]] = {}

            for token_data in tokens:
                i = token_data['idx']
                word = token_data['text']

                if not token_data['is_word'] or not word.replace("-", "").isalpha():
                    results[i] = {
                        "idx": i,
                        "text": word,
                        "to_be_normalized": False,
                        "suggestions": [],
                        "is_word": False,
                        "whitespace_after": token_data.get('whitespace_after', ''),
                    }
                    continue

                candidates: set[str] = set()
                candidates.update(self.spell.candidates(word) or [])
                try:
                    candidates.update(self.hobj.suggest(word))
                except Exception:
                    pass

                candidates.discard(word)

                # Case-match candidates to the original word
                final: list[str] = []
                for c in candidates:
                    if word.isupper():
                        final.append(c.upper())
                    elif word[0].isupper():
                        final.append(c.capitalize())
                    else:
                        final.append(c.lower())

                token_candidates[i] = final

                results[i] = {
                    "idx": i,
                    "text": word,
                    "to_be_normalized": False,  # updated later
                    "suggestions": [],
                    "is_word": True,
                    "whitespace_after": token_data.get('whitespace_after', ''),
                }

            # --- Phase 2: LLM error detection ------------------
            llm_corrections = self._get_llm_corrections(text)

            # --- Phase 3 -------------------------------------
            for token_data in tokens:
                i = token_data['idx']
                if not results[i]["is_word"]:
                    continue

                word = token_data['text']
                word_lower = word.lower()
                dict_is_correct = self._is_valid_pt_word(word)
                llm_flagged = word_lower in llm_corrections

                if llm_assists_detection:
                    # LLM participates in the correctness decision
                    if llm_flagged and not dict_is_correct:
                        to_be_normalized = True
                    elif llm_flagged and dict_is_correct:
                        to_be_normalized = bool(llm_corrections[word_lower])
                    elif not llm_flagged and not dict_is_correct:
                        # LLM didn't flag it
                        to_be_normalized = False
                    else:
                        to_be_normalized = False
                else:
                    # Dictionary-only detection
                    to_be_normalized = not dict_is_correct

                # Build suggestion list: LLM suggestions first, then dict candidates
                suggestions: list[str] = []
                if llm_flagged:
                    for s in llm_corrections[word_lower]:
                        # Case-match LLM suggestions
                        if word.isupper():
                            s_matched = s.upper()
                        elif word[0].isupper():
                            s_matched = s.capitalize()
                        else:
                            s_matched = s.lower()
                        if s_matched not in suggestions and s_matched.lower() != word_lower:
                            suggestions.append(s_matched)

                for c in token_candidates.get(i, []):
                    if c not in suggestions:
                        suggestions.append(c)

                MAX_SUGGESTIONS = 7
                suggestions = suggestions[:MAX_SUGGESTIONS]

                results[i]["to_be_normalized"] = to_be_normalized
                results[i]["suggestions"] = suggestions

            logger.info(
                'Text processing finished',
                extra={
                    'event': {
                        'status': 'success',
                        'duration_ms': int((time.perf_counter() - start_time) * 1000),
                        'token_count': len(results),
                    }
                },
            )

            return results
        except Exception as e:
            logger.exception(
                'Text processing finished with error',
                extra={
                    'event': {
                        'status': 'error',
                        'duration_ms': int((time.perf_counter() - start_time) * 1000),
                        'error': str(e),
                    }
                },
            )
            raise

if __name__ == "__main__":
    processor = TextProcessor()

    text = """
        O problema e grande para mundo

        Necessidade renovar todos os idosos construção e vão limpar e organizar.

        O governo precisa fazer casas para Azulejos melhor que no Brasil e calor.

        O ministerio de saude precisa fazer todos os hospitalis gratis. Para Azulejos.

        Tambem o Ministerio do trabalho precisa resolver esse problema.

        Nos vamos ajudar com dinheiro ou com comida.

        eu acho que resoluar problema esse.
    """

    print(f"Using model: {OLLAMA_MODEL}")
    print(f"Ollama URL: {OLLAMA_BASE_URL}")
    print("Processing text...")

    start_time = time.time()
    results = processor.process_text(text, llm_assists_detection=False)
    end_time = time.time()

    total_time = end_time - start_time
    num_tokens = len(results)
    time_per_token = total_time / num_tokens if num_tokens > 0 else 0

    print(f"\nPerformance Metrics:")
    print(f"  Total time: {total_time:.4f}s")
    print(f"  Total tokens: {num_tokens}")
    print(f"  Time per token: {time_per_token:.4f}s")

    print(f"\nText processed:\n{text}")
    print("\nCorrections found:")
    for idx, data in results.items():
        if data["to_be_normalized"]:
            print(f"  Token {idx}: '{data['text']}' -> {data['suggestions']}")
