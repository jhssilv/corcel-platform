#!/bin/bash

# Variables
CONTAINER_NAME="corcel-db-1"
POSTGRES_USER="postgres"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)

# Run backup
docker exec -t $CONTAINER_NAME pg_dumpall -c -U $POSTGRES_USER > dump_$TIMESTAMP.sql

# Delete old backups (older than 7 days)
# find /backups -name "*.sql" -type f -mtime +7 -exec rm {} \;