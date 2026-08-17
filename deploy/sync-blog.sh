#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/ovo7-blog}"
PUBLIC_ROOT="${PUBLIC_ROOT:-/var/www/blog.ovo7.cc}"
LOCK_FILE="${LOCK_FILE:-/run/lock/ovo7-blog-sync.lock}"

exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
  echo "A blog sync is already running; skipping this cycle."
  exit 0
fi

cd "${APP_DIR}"

if [[ ! -d node_modules ]]; then
  npm ci
fi

if [[ -n "${BUILD_MODE:-}" ]]; then
  npm run build -- --mode "${BUILD_MODE}"
else
  npm run build
fi

release_id="$(date -u +%Y%m%dT%H%M%SZ)"
release_dir="${PUBLIC_ROOT}/releases/${release_id}"
next_link="${PUBLIC_ROOT}/.current-next"

install -d -m 0755 "${release_dir}"
rsync -a --delete "${APP_DIR}/dist/" "${release_dir}/"
ln -sfn "${release_dir}" "${next_link}"
mv -Tf "${next_link}" "${PUBLIC_ROOT}/current"

echo "Published ${release_id}"
