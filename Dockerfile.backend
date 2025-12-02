FROM python:3.12-slim

# Installs system dependencies, including Redis
RUN apt-get update && apt-get install -y \
    build-essential \
    libhunspell-dev \
    python3-dev \
    hunspell-pt-br \
    redis-server \
    && apt-get clean

WORKDIR /app/api

# Copies requirements from the 'api' folder (assuming context is root)
COPY api/requirements.txt .

RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

RUN python -c "import spacy_udpipe; spacy_udpipe.download('pt')"

# Copies the rest of the backend code
COPY api/ /app/api

RUN chmod +x /app/api/start.sh

EXPOSE 5000

# Executes the script that manages Redis, Celery, and Flask
CMD ["./start.sh"]