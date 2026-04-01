# Corspell

**Corspell** is a modular application designed to automate the detection of non-standard words and the generation of  form replacements for Brazilian Portuguese texts in order to normalize spelling. Thought it is still under development, we aimed at a design that allows others developers and researchers to easily swap, customize and modify core features, like our [text processing pipeline](api/docs/text-processing-pipeline.md).

![Login page](images/userauth.png)
![Main page](images/mainpage.png)
![Text Visualization](images/text-visualization.png)

---

## Features

### Text processing and normalization
CorSpell currently supports the upload of zipped batches of text files in `txt` and `docx` formats. Once uploaded, these go through a customizeable processing pipeline, further detailed [here](api/docs/text-processing-pipeline.md), and is then made available to users for normalization. 

### OCR processing
This application currently supports OCR processing via the Gemini API. Though completely optional, it is suitable for users that need to more easily transcribe and review large quantites of digitized handwritten documents.

## Quick Start

> **Note:** This project does not include the original private database due to sensitive data. The public repo demonstrates architecture, UI, and integration points.

1. Clone the repository:
   ```bash
   git clone https://github.com/jhssilv/corcel-platform.git
   cd corcel-platform
   ```
2. Copy or create your own Postgres database and update connection info in `docker-compose.yml` and backend configuration.
3. Start the platform:
   ```bash
   docker-compose up --build
   ```
4. Access the web interface at `http://localhost:8080`.

For a detailed setup and development guide, see [HOWTO.md](HOWTO.md).

## Contributing

Pull requests, bug reports, and feature suggestions are welcome! Please open an issue first to discuss major changes.

---

## Disclaimer

**This version is for demonstration and development.** It does not include the proprietary database used in production.
