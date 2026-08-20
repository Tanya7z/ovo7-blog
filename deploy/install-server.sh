#!/usr/bin/env bash
set -euo pipefail

ARCHIVE_PATH="${1:-/tmp/ovo7-blog-source.tar.gz}"
APP_DIR="${APP_DIR:-/opt/ovo7-blog}"
PUBLIC_ROOT="${PUBLIC_ROOT:-/var/www/blog.ovo7.cc}"
ENV_FILE="${ENV_FILE:-/etc/ovo7-blog.env}"
SERVICE_USER="${SERVICE_USER:-ovo7blog}"
SERVICE_GROUP="${SERVICE_GROUP:-www-data}"
NODE_VERSION="${NODE_VERSION:-v22.23.2}"
NODE_SHA256="${NODE_SHA256:-d60acfe00a2932254bb0ad20e01b0d74397a0875595de719654b214f4b03f307}"
NODE_DIR="/opt/node-${NODE_VERSION}-linux-x64"
NODE_LINK="/opt/ovo7-node"
STAGING_DIR="$(mktemp -d /tmp/ovo7-blog-install.XXXXXX)"

cleanup() {
  rm -rf "${STAGING_DIR}"
}
trap cleanup EXIT

if [[ ! -f "${ARCHIVE_PATH}" ]]; then
  echo "Archive not found: ${ARCHIVE_PATH}" >&2
  exit 1
fi

tar -xzf "${ARCHIVE_PATH}" -C "${STAGING_DIR}"

if ! id -u "${SERVICE_USER}" >/dev/null 2>&1; then
  useradd \
    --system \
    --gid "${SERVICE_GROUP}" \
    --home-dir "${APP_DIR}" \
    --shell /usr/sbin/nologin \
    "${SERVICE_USER}"
fi

install -d -o "${SERVICE_USER}" -g "${SERVICE_GROUP}" -m 0750 "${APP_DIR}"
install -d -o "${SERVICE_USER}" -g "${SERVICE_GROUP}" -m 2775 \
  "${PUBLIC_ROOT}" "${PUBLIC_ROOT}/releases"

rsync -a --delete --exclude node_modules "${STAGING_DIR}/" "${APP_DIR}/"
chown -R "${SERVICE_USER}:${SERVICE_GROUP}" "${APP_DIR}"
chmod -R u=rwX,g=rX,o= "${APP_DIR}"
chmod 0750 "${APP_DIR}"
chmod 0750 "${APP_DIR}/deploy/install-server.sh" "${APP_DIR}/deploy/sync-blog.sh"

if [[ ! -f "${ENV_FILE}" ]]; then
  install -o root -g "${SERVICE_GROUP}" -m 0640 /dev/null "${ENV_FILE}"
  cat >"${ENV_FILE}" <<'EOF'
NOTION_API_SECRET=
DATABASE_ID=823085de972b4542b1cfdfb9a8a96dfa
DATA_SOURCE_ID=7ab4f37d-daf0-4c80-90ee-9d95b8b2d571
CUSTOM_DOMAIN=blog.ovo7.cc
SITE_TITLE=七罪的手账本
SITE_DESCRIPTION=La vida no tiene precio.
SITE_LANGUAGE=zh-CN
NOTION_TITLE_PROPERTY=名称
NOTION_DATE_PROPERTY=日期
NOTION_CATEGORIES_PROPERTY=类型
NOTION_DOMAINS_PROPERTY=领域
NOTION_LABELS_PROPERTY=标签
NOTION_FEATURED_IMAGE_PROPERTY=封面
NOTION_FILTER_PROPERTY=
NOTION_FILTER_VALUE=
NOTION_FILTER_TYPE=select
NOTION_SORT_PROPERTY=创建时间
ENABLE_LIGHTBOX=true
EOF
fi

install -m 0644 "${APP_DIR}/deploy/ovo7-blog-sync.service" \
  /etc/systemd/system/ovo7-blog-sync.service
install -m 0644 "${APP_DIR}/deploy/ovo7-blog-sync.timer" \
  /etc/systemd/system/ovo7-blog-sync.timer
install -m 0644 "${APP_DIR}/deploy/blog.ovo7.cc.nginx.conf" \
  /etc/nginx/sites-available/blog.ovo7.cc

systemctl daemon-reload
nginx -t

if [[ ! -x "${NODE_DIR}/bin/node" ]]; then
  node_archive="/tmp/node-${NODE_VERSION}-linux-x64.tar.xz"
  curl -fsSL \
    "https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-linux-x64.tar.xz" \
    -o "${node_archive}"
  echo "${NODE_SHA256}  ${node_archive}" | sha256sum -c -
  tar -xJf "${node_archive}" -C /opt
fi
ln -sfn "${NODE_DIR}" "${NODE_LINK}"

sudo -u "${SERVICE_USER}" env \
  PATH="${NODE_LINK}/bin:/usr/bin:/bin" \
  npm ci --prefix "${APP_DIR}" --no-audit --no-fund

echo "Server prepared. Add NOTION_API_SECRET before enabling the timer or site."
