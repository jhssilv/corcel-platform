#!/bin/bash

# Variables
DATABASE_CONTAINER_NAME="corcel_platform_db_1"
POSTGRES_USER="postgres"

# Makes the script exit on error
set -e

# Create new dump file
docker exec -t $DATABASE_CONTAINER_NAME pg_dumpall -c -U $POSTGRES_USER > dump_temp.sql

# Pull new changes from git
cd ..
git pull origin main

# Rebuild and redeploy the containers
docker-compose up -d --build
