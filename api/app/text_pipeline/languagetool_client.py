import os
import logging
import requests

logger = logging.getLogger(__name__)

class LanguageToolClient:
    def __init__(self, base_url: str = None):
        self.base_url = base_url or os.environ.get("LANGUAGETOOL_URL", "http://localhost:8010")

    def check_text(self, text: str, language: str = "pt-BR") -> list[dict]:
        """
        Sends text to the LanguageTool API and returns a list of matches.
        Returns an empty list on failure.
        """
        if not text.strip():
            return []
            
        try:
            response = requests.post(
                f"{self.base_url}/v2/check",
                data={"text": text, "language": language},
                timeout=10.0
            )
            response.raise_for_status()
            
            data = response.json()
            matches = data.get("matches", [])
            
            # Format the output to a cleaner dictionary to decouple from LT's exact schema
            clean_matches = []
            for match in matches:
                clean_matches.append({
                    "offset": match.get("offset"),
                    "length": match.get("length"),
                    "replacements": [r.get("value") for r in match.get("replacements", [])][:5], # Keep top 5
                    "message": match.get("message"),
                })
            
            return clean_matches
            
        except Exception as e:
            logger.error(f"Error querying LanguageTool: {e}")
            return []
