#!/bin/bash
set -e
echo "=== env file MEDIA ==="
grep MEDIA /etc/ovo7-blog.env || true
echo "=== service env ==="
sudo -u ovo7blog env -i $(grep -v '^#' /etc/ovo7-blog.env | xargs -d '\n' -I{} echo {}) bash -c 'echo MEDIA_ORIGIN=$MEDIA_ORIGIN' 2>/dev/null || \
  systemctl show ovo7-blog-sync.service -p EnvironmentFiles --no-pager
echo "=== explore img src sample ==="
grep -oE 'src="[^"]+"' /var/www/blog.ovo7.cc/current/explore/index.html | head -8
echo "=== notion on imgbed count ==="
find /var/www/img.ovo7.cc/blog/notion -type f 2>/dev/null | wc -l
echo "=== current release ==="
readlink -f /var/www/blog.ovo7.cc/current
