$ErrorActionPreference = "Stop"

function Require-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Missing required command '$name'. Install PostgreSQL client tools (pg_dump/pg_restore/psql) and try again."
  }
}

function Require-Env($name) {
  $value = [Environment]::GetEnvironmentVariable($name)
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Missing environment variable '$name'."
  }
  return $value
}

Require-Command pg_dump
Require-Command pg_restore

$oldUrl = Require-Env "OLD_DATABASE_URL"
$newUrl = Require-Env "NEW_DATABASE_URL"

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$dumpPath = Join-Path (Get-Location) ("railway-backup-$timestamp.dump")

Write-Host "Exporting OLD database -> $dumpPath"
pg_dump "$oldUrl" --format=custom --no-owner --no-acl -f "$dumpPath"

Write-Host "Importing dump into NEW database (this will clean existing objects)"
pg_restore --no-owner --no-acl --clean --if-exists --dbname "$newUrl" "$dumpPath"

if (Get-Command psql -ErrorAction SilentlyContinue) {
  Write-Host "Basic verification (row counts):"
  try {
    psql "$newUrl" -c 'select count(*) as "User" from "User";'
    psql "$newUrl" -c 'select count(*) as "UserChallenge" from "UserChallenge";'
    psql "$newUrl" -c 'select count(*) as "ChallengeUpload" from "ChallengeUpload";'
    psql "$newUrl" -c 'select count(*) as "Announcement" from "Announcement";'
  } catch {
    Write-Host "Verification queries failed (psql present, but query failed). You can ignore this if restore succeeded."
  }
}

Write-Host "Done."

