#!/usr/bin/env bash
# 本地构建辅助：把 .env 逐行注入 process.env 再构建。
#
# 为什么需要：astro.config.mjs 及它导入的 integration 跑在 Astro 的配置加载
# 上下文里，那里拿不到 Vite 注入的 import.meta.env，而仓库没有 dotenv，
# 于是本地 `npm run build` 会读到空 token。服务器上由 systemd 的
# EnvironmentFile 注入，链路是通的，所以只有本地需要这一步。
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo ".env 不存在，改用 mock 构建：npm run build:mock" >&2
  exit 1
fi

while IFS= read -r line || [ -n "$line" ]; do
  # 先去掉可能的 CR（Windows 换行），否则空行会被当成键名
  line="${line%$'\r'}"
  case "$line" in
    '' | \#*) continue ;;
    *=*) ;;
    *) continue ;;
  esac
  key="${line%%=*}"
  value="${line#*=}"
  [ -n "$key" ] || continue
  export "$key=$value"
done < .env

npm run build "$@"
