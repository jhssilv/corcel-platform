"""Custom exceptions for the text processing pipeline."""


class ResourceLoadError(Exception):
    """Raised when a required external resource fails to load.

    Examples: Hunspell dictionaries, spaCy model, SpellChecker dictionary.
    """
