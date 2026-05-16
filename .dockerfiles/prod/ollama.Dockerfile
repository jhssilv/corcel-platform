FROM ollama/ollama:latest

ENV OLLAMA_CONTEXT_LENGTH=2048

EXPOSE 11434

ENTRYPOINT ["/bin/ollama"]
CMD ["serve"]
