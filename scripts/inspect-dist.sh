#!/usr/bin/env bash
# 构建产物自检：确认贴画/拼贴渲染到位，且样式边界没有溢出到文章页。
set -uo pipefail
cd "$(dirname "$0")/.."

count() {
  grep -o "$1" "$2" 2>/dev/null | wc -l
}

echo "首页贴画条目数: $(count 'li class=\"sticker\"' dist/index.html)"
echo "探索 cell 次数: $(count 'class=\"cell\"' dist/explore/index.html)"
echo "探索 img 次数: $(count 'img src' dist/explore/index.html)"
echo "探索 blank 次数: $(count 'class=\"blank\"' dist/explore/index.html)"
echo "探索 评分条 次数: $(count 'score-fill' dist/explore/index.html)"
echo "探索 本地封面 次数: $(count '/notion/' dist/explore/index.html)"
echo "--- 封面地址样本 ---"
grep -o 'img src="[^"]*"' dist/explore/index.html | head -4

echo "--- 文章页样式边界 ---"
post=$(ls dist/posts/*/index.html 2>/dev/null | head -1)
echo "样本文章页: $post"
for css in $(grep -o '_astro/[A-Za-z0-9._-]*css' "$post" | sort -u); do
  if grep -q 'polaroid' "dist/$css"; then
    echo "  [越界] $css 含 sticker 样式"
  else
    echo "  [干净] $css"
  fi
done
