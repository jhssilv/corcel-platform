#!/usr/bin/env python3
"""Manual smoke-test harness for the text processing pipeline.

Run from the project root::

    PYTHONPATH=api python scripts/test_processor.py

Requires a running LanguageTool instance and the Hunspell PT-BR dictionaries installed.
"""

import os
import sys
import time

# Allow running from the project root without installing the package.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'api'))

from app.text_pipeline import process_text

SAMPLE_TEXT = """
    O problema e grande para mundo

    Necessidade renovar todos os idosos construção e vão limpar e organizar.

    O governo precisa fazer casas para Azulejos melhor que no Brasil e calor.

    O ministerio de saude precisa fazer todos os hospitalis gratis. Para Azulejos.

    Tambem o Ministerio do trabalho precisa resolver esse problema.

    Nos vamos ajudar com dinheiro ou com comida.

    eu acho que resoluar problema esse.
"""


def main():
    print("Processing …\n")

    start = time.time()
    results = process_text(SAMPLE_TEXT)
    elapsed = time.time() - start

    num_tokens = len(results)
    print(f"Performance")
    print(f"  Total time  : {elapsed:.4f}s")
    print(f"  Tokens      : {num_tokens}")
    print(f"  Time/token  : {elapsed / num_tokens:.4f}s\n" if num_tokens else "")

    print(f"Text:\n{SAMPLE_TEXT}")
    print("Corrections found:")
    for idx, data in results.items():
        if data["to_be_normalized"]:
            print(f"  [{idx}] '{data['text']}' -> {data['suggestions']}")


if __name__ == "__main__":
    main()
