"""Typed data models for the text processing pipeline.

All internal pipeline methods operate on these dataclasses rather than
raw dicts, providing type safety, autocomplete, and self-documenting
field names.
"""

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Token:
    """Immutable representation of a single tokenized unit produced by the Tokenizer."""

    idx: int
    text: str
    is_word: bool
    whitespace_after: str = ""


@dataclass
class ProcessedToken:
    """A token after dictionary + LLM analysis.

    Mutable so the pipeline phases can progressively fill in
    ``to_be_normalized`` and ``suggestions``.
    """

    idx: int
    text: str
    is_word: bool
    whitespace_after: str = ""
    to_be_normalized: bool = False
    suggestions: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        """Serialize to the dict format expected by existing consumers
        (routes, Celery tasks, DB insertion helpers).
        """
        return {
            "idx": self.idx,
            "text": self.text,
            "is_word": self.is_word,
            "whitespace_after": self.whitespace_after,
            "to_be_normalized": self.to_be_normalized,
            "suggestions": list(self.suggestions),
        }
