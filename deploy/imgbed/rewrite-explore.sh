#!/bin/bash
set -e
IMGBED=/var/www/img.ovo7.cc/blog/mirror
echo "mirror files=$(find "$IMGBED" -type f | wc -l)"
if [[ ! -f /tmp/explore-rewrite.sed ]]; then
  echo "missing sed script"
  exit 1
fi
# 只改 explore，避免误伤文章里的外链引用
sed -i -f /tmp/explore-rewrite.sed /var/www/blog.ovo7.cc/current/explore/index.html
echo "imgbed_urls=$(grep -c 'img.ovo7.cc/blog/mirror' /var/www/blog.ovo7.cc/current/explore/index.html || true)"
echo "lain_left=$(grep -c 'lain.bgm.tv' /var/www/blog.ovo7.cc/current/explore/index.html || true)"
