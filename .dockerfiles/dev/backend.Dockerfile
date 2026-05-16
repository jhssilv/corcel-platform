FROM python:3.12-slim

RUN apt-get update && apt-get install -y \
    build-essential \
    libhunspell-dev \
    python3-dev \
    hunspell-pt-br \
    redis-server \
    && apt-get clean

WORKDIR /app/api

COPY api/requirements.txt .

RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

RUN python -c "import spacy_udpipe; spacy_udpipe.download('pt')"

EXPOSE 5000
