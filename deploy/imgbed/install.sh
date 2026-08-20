#!/usr/bin/env bash
# 在阿里云上安装 img.ovo7.cc。可重复执行。
set -euo pipefail

SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="/var/www/img.ovo7.cc"
OPT="/opt/imgbed"
TOKEN_FILE="/etc/imgbed/tokens.json"

install -d -o www-data -g www-data -m 0775 \
  "${ROOT}" "${ROOT}/blog" "${ROOT}/sapi" "${ROOT}/notes"
install -d -o root -g root -m 0755 "${OPT}" /etc/imgbed

install -m 0755 "${SRC_DIR}/server.mjs" "${OPT}/server.mjs"
install -m 0755 "${SRC_DIR}/imgup" /usr/local/bin/imgup
install -m 0644 "${SRC_DIR}/imgbed.service" /etc/systemd/system/imgbed.service
install -m 0644 "${SRC_DIR}/img.ovo7.cc.nginx.conf" \
  /etc/nginx/sites-available/img.ovo7.cc
ln -sfn /etc/nginx/sites-available/img.ovo7.cc /etc/nginx/sites-enabled/img.ovo7.cc

if [[ ! -f "${TOKEN_FILE}" ]]; then
  blog_token="$(openssl rand -hex 24)"
  sapi_token="$(openssl rand -hex 24)"
  notes_token="$(openssl rand -hex 24)"
  cat >"${TOKEN_FILE}" <<EOF
{
  "tokens": [
    { "name": "blog", "token": "${blog_token}", "defaultBucket": "blog", "buckets": ["blog"] },
    { "name": "sapi", "token": "${sapi_token}", "defaultBucket": "sapi", "buckets": ["sapi"] },
    { "name": "notes", "token": "${notes_token}", "defaultBucket": "notes", "buckets": ["notes"] }
  ]
}
EOF
  chmod 0640 "${TOKEN_FILE}"
  chown root:www-data "${TOKEN_FILE}"
  echo "已写入 ${TOKEN_FILE}（只在本机看，不要提交 git）"
fi

# 博客同步进程用 ovo7blog:www-data 往 blog 桶写
chown -R www-data:www-data "${ROOT}"
chmod 2775 "${ROOT}" "${ROOT}/blog" "${ROOT}/sapi" "${ROOT}/notes"

nginx -t
systemctl daemon-reload
systemctl enable --now imgbed.service
systemctl reload nginx

if [[ ! -f /etc/letsencrypt/live/img.ovo7.cc/fullchain.pem ]]; then
  certbot --nginx -d img.ovo7.cc --non-interactive --agree-tos \
    --redirect -m hi@ovo7.cc --keep-until-expiring
fi

systemctl --no-pager --full status imgbed.service | head -20
echo "安装完成。公开读：https://img.ovo7.cc/{bucket}/{file}"
