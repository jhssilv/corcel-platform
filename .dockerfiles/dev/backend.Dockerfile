FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:0.11.15 /uv /uvx /bin/

ENV UV_PROJECT_ENVIRONMENT=/opt/venv
ENV PATH="/opt/venv/bin:$PATH"

RUN apt-get update && apt-get install -y \
    build-essential \
    libhunspell-dev \
    python3-dev \
    hunspell-pt-br \
    && apt-get clean

WORKDIR /app/api

COPY api/pyproject.toml api/uv.lock ./

RUN uv sync --frozen --no-dev

RUN uv run python -c "import spacy_udpipe; spacy_udpipe.download('pt')"

COPY api/ /app/api

RUN chmod +x /app/api/start.sh

EXPOSE 5000
