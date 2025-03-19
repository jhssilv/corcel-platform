#!/bin/bash

# Check if the dump file argument is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <dump_file.sql>"
  exit 1
fi

# Variables
DB_NAME="corcel"  # Replace with your database name
DUMP_FILE="$1"

# Drop the existing database (if it exists)
echo "Dropping database $DB_NAME..."
docker exec -i corcel-db-1 psql -U postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"

# Recreate the database
echo "Recreating database $DB_NAME..."
docker exec -i corcel-db-1 psql -U postgres -c "CREATE DATABASE $DB_NAME;"

# Restore the dump into the new database
echo "Restoring $DUMP_FILE into $DB_NAME..."
cat $DUMP_FILE | docker exec -i corcel-db-1 psql -U postgres -d $DB_NAME

echo "Database $DB_NAME has been overwritten with the data from $DUMP_FILE."