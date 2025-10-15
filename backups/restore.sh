#!/bin/bash

# ====================================================================
# DATABASE RESTORE SCRIPT
#
# This script drops and recreates the database, restoring its state
# from a provided SQL dump file.
#
# Prerequisites:
# - Must be run from the project's root directory.
# - The .env file must be present and correctly configured.
# - Docker containers must be running (docker-compose up -d).
# ====================================================================

# Exit the script immediately if any command fails
set -e

echo "Starting the database restore process..."

if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo "ERROR: .env file not found. Make sure you are running the script from the project root."
  exit 1
fi

DUMP_FILE="$1"
if [ -z "$DUMP_FILE" ]; then
  echo "ERROR: You must provide the path to the dump file."
  echo "Usage: $0 <path/to/dump.sql>"
  exit 1
fi

if [ ! -f "$DUMP_FILE" ]; then
  echo "ERROR: Dump file not found at '$DUMP_FILE'."
  exit 1
fi

### Database service name in docker-compose.yml
DB_SERVICE_NAME="db"

echo "Dropping the existing database '${POSTGRES_DB}'..."
docker-compose exec -T "$DB_SERVICE_NAME" psql -U postgres -c "DROP DATABASE IF EXISTS ${POSTGRES_DB};"

echo "Recreating the database '${POSTGRES_DB}'..."
docker-compose exec -T "$DB_SERVICE_NAME" psql -U postgres -c "CREATE DATABASE ${POSTGRES_DB};"

echo "Restoring content from '${DUMP_FILE}' into '${POSTGRES_DB}'..."
cat "$DUMP_FILE" | docker-compose exec -T "$DB_SERVICE_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

echo "Database '${POSTGRES_DB}' has been overwritten with data from '${DUMP_FILE}'."
```

### How to Use this script

1.  **Make it Executable:** Run this command once in your terminal to give the script execution permissions.
    ```bash
    chmod +x backups/restore_db.sh
    
