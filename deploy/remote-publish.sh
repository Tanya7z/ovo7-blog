#!/usr/bin/env bash
# 在阿里云上解压 CI 产物并发布。
#
# 用法：
#   remote-publish.sh <archive.tar.gz> full    # HTML + 图床（备案后的主路径）
#   remote-publish.sh <archive.tar.gz> media   # 只同步 notion/mirror 到图床（CF 托管 HTML 时用）
set -euo pipefail

ARCHIVE="${1:-}"
MODE="${2:-full}"
PUBLIC_ROOT="${PUBLIC_ROOT:-/var/www/blog.ovo7.cc}"
IMGBED_ROOT="${IMGBED_ROOT:-/var/www/img.ovo7.cc}"
STAGING="$(mktemp -d /tmp/ovo7-blog-publish.XXXXXX)"

cleanup() {
  rm -rf "${STAGING}"
}
trap cleanup EXIT

if [[ -z "${ARCHIVE}" || ! -f "${ARCHIVE}" ]]; then
  echo "用法：remote-publish.sh <archive.tar.gz> [full|media]" >&2
  exit 1
fi
if [[ "${MODE}" != "full" && "${MODE}" != "media" ]]; then
  echo "MODE 只能是 full 或 media" >&2
  exit 1
fi

tar -xzf "${ARCHIVE}" -C "${STAGING}"

# 兼容「打包整个 dist/」或「包内已是站点根」两种结构
if [[ -f "${STAGING}/dist/index.html" ]]; then
  SITE_ROOT="${STAGING}/dist"
elif [[ -f "${STAGING}/index.html" ]]; then
  SITE_ROOT="${STAGING}"
else
  echo "压缩包里找不到 index.html" >&2
  exit 1
fi

sync_imgbed() {
  if [[ ! -d "${IMGBED_ROOT}/blog" ]]; then
    echo "跳过图床：${IMGBED_ROOT}/blog 不存在"
    return 0
  fi
  if [[ -d "${SITE_ROOT}/notion" ]]; then
    mkdir -p "${IMGBED_ROOT}/blog/notion"
    rsync -a --delete "${SITE_ROOT}/notion/" "${IMGBED_ROOT}/blog/notion/"
    echo "imgbed notion synced"
  fi
  if [[ -d "${SITE_ROOT}/mirror" ]]; then
    mkdir -p "${IMGBED_ROOT}/blog/mirror"
    rsync -a --delete "${SITE_ROOT}/mirror/" "${IMGBED_ROOT}/blog/mirror/"
    echo "imgbed mirror synced"
  fi
  chown -R www-data:www-data "${IMGBED_ROOT}/blog" 2>/dev/null || true
}

if [[ "${MODE}" == "media" ]]; then
  sync_imgbed
  rm -f "${ARCHIVE}"
  echo "publish_ok mode=media"
  exit 0
fi

release_id="$(date -u +%Y%m%dT%H%M%SZ)"
release_dir="${PUBLIC_ROOT}/releases/${release_id}"
next_link="${PUBLIC_ROOT}/.current-next"

install -d -m 0755 "${release_dir}"
rsync -a --delete "${SITE_ROOT}/" "${release_dir}/"
ln -sfn "${release_dir}" "${next_link}"
mv -Tf "${next_link}" "${PUBLIC_ROOT}/current"
chown -R www-data:www-data "${PUBLIC_ROOT}/current" 2>/dev/null || true

sync_imgbed
rm -f "${ARCHIVE}"

test -f "${PUBLIC_ROOT}/current/index.html"
echo "publish_ok mode=full release=${release_id}"
