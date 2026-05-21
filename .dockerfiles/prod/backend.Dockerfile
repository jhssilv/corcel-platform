FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:0.11.15 /uv /uvx /bin/

# Installs system dependencies, including Redis
RUN apt-get update && apt-get install -y \
    build-essential \
    libhunspell-dev \
    python3-dev \
    hunspell-pt-br \
    redis-server \
    && apt-get clean

WORKDIR /app/api

# Copy backend dependency manifests first for a stable cache key
COPY api/pyproject.toml api/uv.lock ./

RUN uv sync --frozen --no-dev

RUN uv run python -c "import spacy_udpipe; spacy_udpipe.download('pt')"

# Copies the rest of the backend code
COPY api/ /app/api

RUN chmod +x /app/api/start.sh

EXPOSE 5000

# Executes the script that manages Redis, Celery, and Flask
CMD ["./start.sh"]
