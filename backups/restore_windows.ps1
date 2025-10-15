# ====================================================================
# DATABASE RESTORE SCRIPT (PowerShell)
#
# This script drops and recreates the database, restoring its state
# from a provided SQL dump file.
#
# Prerequisites:
# - Must be run from the project's root directory.
# - The .env file must be present and correctly configured.
# - Docker containers must be running (docker-compose up -d).
#
# Usage:
# .\backups\restore_db.ps1 -DumpFile path\to\your\dump.sql
# ====================================================================

# Define the parameters the script accepts
param (
    [Parameter(Mandatory=$true)]
    [string]$DumpFile
)

# Set the script to exit immediately if any command fails
$ErrorActionPreference = "Stop"

Write-Host "Starting the database restore process..."

# Load variables from the .env file
if (-not (Test-Path ".env")) {
    Write-Host "ERROR: .env file not found. Make sure you are running the script from the project root." -ForegroundColor Red
    exit 1
}
# Parse the .env file and set environment variables for the current session
Get-Content .\.env | ForEach-Object {
    if ($_ -match '^(?!#)([^=]+)=(.*)$') {
        Set-Content "env:$($matches[1])" $matches[2]
    }
}

if (-not (Test-Path $DumpFile)) {
    Write-Host "ERROR: Dump file not found at '$DumpFile'." -ForegroundColor Red
    exit 1
}

# Define the database service name (must match docker-compose.yml)
$DbServiceName = "db"

Write-Host "Dropping the existing database '$($env:POSTGRES_DB)'..."
docker-compose exec -T $DbServiceName "psql -U postgres -c 'DROP DATABASE IF EXISTS $($env:POSTGRES_DB);'"

Write-Host "Recreating the database '$($env:POSTGRES_DB)'..."
docker-compose exec -T $DbServiceName "psql -U postgres -c 'CREATE DATABASE $($env:POSTGRES_DB);'"

Write-Host "Restoring content from '$DumpFile' into '$($env:POSTGRES_DB)'..."
# -Encoding UTF8 flag here is VERY IMPORTANT
Get-Content -Path $DumpFile -Encoding UTF8 | docker-compose exec -T $DbServiceName "psql -U $($env:POSTGRES_USER) -d $($env:POSTGRES_DB)"

Write-Host "Database '$($env:POSTGRES_DB)' has been overwritten with data from '$DumpFile'."