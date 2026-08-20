#!/bin/bash
echo "=== notion paths in site ==="
grep -RhoE '(/notion/[^\" ]+|https://img\.ovo7\.cc/blog[^\" ]+)' /var/www/blog.ovo7.cc/current --include='*.html' | sort | uniq | head -20
echo "=== count ==="
grep -RhoE '/notion/' /var/www/blog.ovo7.cc/current --include='*.html' | wc -l
grep -RhoE 'img\.ovo7\.cc/blog' /var/www/blog.ovo7.cc/current --include='*.html' | wc -l
echo "=== run with env ==="
cd /opt/ovo7-blog
set -a
# shellcheck disable=SC1091
source /etc/ovo7-blog.env
set +a
sudo -u ovo7blog env MEDIA_ORIGIN="$MEDIA_ORIGIN" /opt/ovo7-node/bin/node -e "console.log('MEDIA', process.env.MEDIA_ORIGIN)"
