#!/bin/bash

BACKUP_DIR="/dumps"

# Formato do nome do arquivo de backup com data e hora
FILENAME="${BACKUP_DIR}/backup-$(date +%Y-%m-%d-%H-%M-%S).sql.gz"

# Executa o pg_dump usando as variáveis de ambiente
# A variável PGPASSWORD é lida automaticamente pelo pg_dump
export PGPASSWORD=$POSTGRES_PASSWORD
export PGPORT=$POSTGRES_PORT

pg_dump -h $POSTGRES_HOST -p $PGPORT -U $POSTGRES_USER -d $POSTGRES_DB | gzip > "$FILENAME"

# (Opcional) Remove backups mais antigos que 7 dias
find "$BACKUP_DIR" -type f -mtime +7 -name '*.sql.gz' -delete