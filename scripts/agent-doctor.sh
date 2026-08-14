#!/usr/bin/env bash
set -u

failures=0

printf 'current username: %s\n' "$(id -un)"
printf 'uid/gid: %s/%s\n' "$(id -u)" "$(id -g)"
printf 'workspace path: %s\n' "$(pwd)"

if [[ "$(id -u)" -eq 0 ]]; then
  printf '%s\n' 'SECURITY WARNING: the runtime user is root.' >&2
  failures=1
else
  printf '%s\n' 'runtime user is non-root: OK'
fi

if [[ -e /var/run/docker.sock ]]; then
  printf '%s\n' 'SECURITY WARNING: /var/run/docker.sock is mounted.' >&2
  failures=1
else
  printf '%s\n' 'Docker socket mounted: NO'
fi

report_command() {
  local command_name="$1"
  if command -v "$command_name" >/dev/null 2>&1; then
    printf '%s: %s\n' "$command_name" "$("$command_name" --version 2>&1 | sed -n '1p')"
  else
    printf '%s: MISSING\n' "$command_name"
    failures=1
  fi
}

report_command node
report_command npm
report_command git
report_command gh
report_command sqlite3
report_command turso
report_command vercel

report_env() {
  local variable_name="$1"
  if [[ -n "${!variable_name-}" ]]; then
    printf '%s: SET\n' "$variable_name"
  else
    printf '%s: MISSING\n' "$variable_name"
  fi
}

printf '%s\n' 'environment variable presence:'
for variable_name in \
  GH_TOKEN \
  TURSO_DATABASE_URL \
  TURSO_AUTH_TOKEN \
  VERCEL_TOKEN \
  BLOB_READ_WRITE_TOKEN \
  DATABASE_PROVIDER \
  SQLITE_DATABASE_URL \
  NEXT_PUBLIC_APP_URL \
  LOCAL_DEMO_SECRET \
  LOCAL_DEMO_ADMIN_EMAIL \
  LOCAL_DEMO_ADMIN_PASSWORD \
  TRUST_PROXY \
  SMTP_HOST \
  SMTP_PORT \
  SMTP_SECURE \
  SMTP_USER \
  SMTP_PASS \
  EMAIL_FROM \
  NEXT_PUBLIC_SUPABASE_URL \
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
  SUPABASE_SECRET_KEY; do
  report_env "$variable_name"
done

if [[ -d /workspace/.git && -f /workspace/package.json && -w /workspace ]]; then
  printf '%s\n' 'workspace writable with .git and package.json: OK'
else
  printf '%s\n' 'workspace writable with .git and package.json: FAILED' >&2
  failures=1
fi

exit "$failures"
