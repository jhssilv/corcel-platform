import re
import unicodedata
from typing import Optional


def strip_accents(s: str) -> str:
    """Removes diacritics/accents from a string for accent-insensitive matching."""
    if not s:
        return ""
    return "".join(
        c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn"
    )


def extract_search_snippet(
    raw_text: Optional[str], query: Optional[str], window: int = 40
) -> Optional[str]:
    """Extracts a short preview snippet centered around the matching query term.

    Args:
        raw_text: The complete essay text string.
        query: The search term or phrase.
        window: Number of characters of surrounding context on each side.

    Returns:
        A formatted snippet like '...text before [term] text after...' or None.
    """
    if not raw_text or not query:
        return None

    clean_query = query.strip()
    if not clean_query:
        return None

    unacc_text = strip_accents(raw_text)
    unacc_query = strip_accents(clean_query)

    # Search in accent-stripped representation first
    match = re.search(re.escape(unacc_query), unacc_text, flags=re.IGNORECASE)
    if not match:
        # Fallback to direct search on original text
        match = re.search(re.escape(clean_query), raw_text, flags=re.IGNORECASE)

    if not match:
        return None

    start_idx = match.start()
    end_idx = match.end()

    snippet_start = max(0, start_idx - window)
    snippet_end = min(len(raw_text), end_idx + window)

    prefix = "..." if snippet_start > 0 else ""
    suffix = "..." if snippet_end < len(raw_text) else ""

    snippet_text = (
        raw_text[snippet_start:snippet_end]
        .replace("\r", " ")
        .replace("\n", " ")
        .strip()
    )
    return f"{prefix}{snippet_text}{suffix}"
