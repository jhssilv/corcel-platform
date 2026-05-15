"""spaCy-based tokenizer producing typed Token dataclasses.

Designed to be used as a shared instance (e.g. via Flask ``g``) so that
the expensive spaCy model load happens only once per worker.
"""

import spacy
import spacy_udpipe

from .exceptions import ResourceLoadError
from .models import Token
from ..logging_config import get_logger

logger = get_logger('app.task.tokenizer', source='task', task_module='text_task_logic')


class Tokenizer:
    """Tokenizes raw text into a list of :class:`Token` dataclasses.

    The spaCy / UDPipe model is loaded lazily on first use and cached
    for the lifetime of the instance.

    Raises:
        ResourceLoadError: If the spaCy model cannot be downloaded or
            loaded (fail-fast).
    """

    def __init__(self) -> None:
        self._nlp = None

    def _load_resources(self) -> None:
        if self._nlp is not None:
            return

        logger.info('Loading spaCy resources')
        try:
            spacy_udpipe.download("pt")
            nlp = spacy_udpipe.load("pt")
            nlp.tokenizer = spacy.blank("pt").tokenizer
            self._nlp = nlp
        except Exception as exc:
            raise ResourceLoadError(
                'Failed to load spaCy/UDPipe model for pt'
            ) from exc

        logger.info('Tokenizer resources loaded')

    @property
    def nlp(self):
        """Return the loaded spaCy pipeline, loading it on first access."""
        if self._nlp is None:
            self._load_resources()
        return self._nlp

    def tokenize(self, text: str) -> list[Token]:
        """Tokenize *text* and return a list of :class:`Token` dataclasses.

        Args:
            text: Raw text string to tokenize.

        Returns:
            Ordered list of tokens with positional indices.
        """
        doc = self.nlp(text)
        return [
            Token(
                idx=i,
                text=token.text,
                is_word=token.text.isalpha(),
                whitespace_after=token.whitespace_,
            )
            for i, token in enumerate(doc)
        ]
