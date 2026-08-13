"""Dictionary-based spell-checking service.

Encapsulates Hunspell and SpellChecker (pyspellchecker) resources,
including the first-run dictionary download from USP.
"""

import json
import os

import requests
try:
    from hunspell import HunSpell
except ImportError:
    class HunSpell:  # type: ignore
        def __init__(self, *args, **kwargs):
            pass
        def spell(self, word: str) -> bool:
            return False
        def suggest(self, word: str) -> list[str]:
            return []
from spellchecker import SpellChecker

from . import config as cfg
from .exceptions import ResourceLoadError



def _get_resource_path(relative_path: str) -> str:
    """Resolve *relative_path* from the **app/** directory."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base_dir, relative_path)


def _download_dict() -> None:
    """Download the PT-BR word list and convert it to JSON on first run.

    The JSON file is consumed by :class:`SpellChecker`.
    Both the raw ``.txt`` and the converted ``.json`` are stored under
    ``app/dicts/``.

    Raises:
        ResourceLoadError: If the download or conversion fails.
    """
    txt_file_path = _get_resource_path('dicts/br-utf8.txt')
    json_file_path = _get_resource_path('dicts/br-utf8.json')

    os.makedirs(os.path.dirname(txt_file_path), exist_ok=True)

    if not os.path.exists(txt_file_path):
        url = cfg.nlp_dict_download_url()
        timeout = cfg.nlp_dict_download_timeout()
        try:
            resp = requests.get(url, timeout=timeout)
            resp.raise_for_status()
            with open(txt_file_path, 'wb') as f:
                f.write(resp.content)
        except Exception as exc:
            raise ResourceLoadError(
                f'Failed to download dictionary from {url}'
            ) from exc

    if not os.path.exists(json_file_path):
        pass
        data: dict[str, int] = {}
        with open(txt_file_path, 'r', encoding='utf-8') as fh:
            for line in fh:
                word = line.strip()
                if word:
                    data[word] = 1

        with open(json_file_path, 'w', encoding='utf-8') as fh:
            json.dump(data, fh, ensure_ascii=False, indent=4)


def match_case(original: str, candidate: str) -> str:
    """Return *candidate* with casing matched to *original*.

    Rules:
    - ALL CAPS → candidate uppercased
    - Title Case → candidate capitalized
    - Otherwise → candidate lowercased
    """
    if original.isupper():
        return candidate.upper()
    if original[0].isupper():
        return candidate.capitalize()
    return candidate.lower()


class DictionaryService:
    """Provides spell-check validation and candidate generation using
    Hunspell and pyspellchecker.

    Configuration is read from the active Flask app config (via
    :mod:`.config`) at construction time, falling back to
    :class:`~app.config.Config` defaults when no app context is present.

    Resources are loaded lazily on first access and cached for the
    lifetime of the instance.

    Raises:
        ResourceLoadError: On first access if Hunspell or SpellChecker
            resources cannot be loaded (fail-fast).
    """

    def __init__(self) -> None:
        # Capture config values at construction time so the instance is
        # independent of any later context changes.
        self._hunspell_dic = cfg.nlp_hunspell_dic()
        self._hunspell_aff = cfg.nlp_hunspell_aff()
        self._spellchecker_dict = cfg.nlp_spellchecker_dict()

        self._hobj: HunSpell | None = None
        self._spell: SpellChecker | None = None
        self._loaded = False

    # ------------------------------------------------------------------
    # Lazy resource loading
    # ------------------------------------------------------------------

    def _load_resources(self) -> None:
        if self._loaded:
            return

        try:
            self._hobj = HunSpell(self._hunspell_dic, self._hunspell_aff)
        except Exception as exc:
            raise ResourceLoadError(
                f'Failed to load Hunspell dictionaries '
                f'(dic={self._hunspell_dic}, aff={self._hunspell_aff})'
            ) from exc

        _download_dict()

        sc_path = self._spellchecker_dict or _get_resource_path('dicts/br-utf8.json')
        try:
            self._spell = SpellChecker(language=None, local_dictionary=sc_path)
        except Exception as exc:
            raise ResourceLoadError(
                f'Failed to load SpellChecker dictionary ({sc_path})'
            ) from exc

        self._loaded = True

    @property
    def hobj(self) -> HunSpell:
        if not self._loaded:
            self._load_resources()
        assert self._hobj is not None
        return self._hobj

    @property
    def spell(self) -> SpellChecker:
        if not self._loaded:
            self._load_resources()
        assert self._spell is not None
        return self._spell

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def is_valid_word(self, word: str) -> bool:
        """Return ``True`` if *word* is recognised by Hunspell **or** SpellChecker."""
        return self.hobj.spell(word) or bool(self.spell.known([word]))

    def get_candidates(self, word: str) -> list[str]:
        """Return case-matched correction candidates for *word*.

        Candidates are drawn from both Hunspell and SpellChecker,
        deduplicated, and case-matched to *word*.  The original word
        itself is excluded.
        """
        raw: set[str] = set()
        raw.update(self.spell.candidates(word) or [])
        try:
            raw.update(self.hobj.suggest(word))
        except Exception:
            pass

        raw.discard(word)

        return [match_case(word, c) for c in raw]
