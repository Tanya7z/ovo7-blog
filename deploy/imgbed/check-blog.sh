#!/bin/bash
set -e
journalctl -u ovo7-blog-sync.service -n 20 --no-pager
echo "---"
ls /var/www/img.ovo7.cc/blog || true
echo "---"
if grep -q 'img.ovo7.cc/blog' /var/www/blog.ovo7.cc/current/explore/index.html 2>/dev/null; then
  echo explore_has_imgbed=yes
  grep -o 'https://img.ovo7.cc/blog[^\" ]*' /var/www/blog.ovo7.cc/current/explore/index.html | head -5
else
  echo explore_has_imgbed=no
fi
