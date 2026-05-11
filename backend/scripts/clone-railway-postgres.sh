#!/usr/bin/env bash
set -euo pipefail

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command '$1'. Install PostgreSQL client tools (pg_dump/pg_restore/psql) and try again." >&2
    exit 1
  }
}

require_env() {
  local name="$1"
  local value="${!name:-}"
  if [[ -z "${value// }" ]]; then
    echo "Missing environment variable '$name'." >&2
    exit 1
  fi
}

require_cmd pg_dump
require_cmd pg_restore

require_env OLD_DATABASE_URL
require_env NEW_DATABASE_URL

timestamp="$(date +%Y%m%d-%H%M%S)"
dump_path="railway-backup-$timestamp.dump"

echo "Exporting OLD database -> $dump_path"
pg_dump "$OLD_DATABASE_URL" --format=custom --no-owner --no-acl -f "$dump_path"

echo "Importing dump into NEW database (this will clean existing objects)"
pg_restore --no-owner --no-acl --clean --if-exists --dbname "$NEW_DATABASE_URL" "$dump_path"

if command -v psql >/dev/null 2>&1; then
  echo "Basic verification (row counts):"
  psql "$NEW_DATABASE_URL" -c 'select count(*) as "User" from "User";' || true
  psql "$NEW_DATABASE_URL" -c 'select count(*) as "UserChallenge" from "UserChallenge";' || true
  psql "$NEW_DATABASE_URL" -c 'select count(*) as "ChallengeUpload" from "ChallengeUpload";' || true
  psql "$NEW_DATABASE_URL" -c 'select count(*) as "Announcement" from "Announcement";' || true
fi

echo "Done."

