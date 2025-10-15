#!/bin/bash

echo "Making initial backup..."
/backup_script.sh

# Start the cron service in the foreground.
# The 'exec "$@"' executes the command passed by the CMD in the Dockerfile.
echo "Starting cron daemon for scheduled backups..."
exec "$@"