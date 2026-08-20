#!/bin/bash
f=/var/www/blog.ovo7.cc/current/explore/index.html
echo "size=$(wc -c < "$f")"
grep -oE 'src="[^"]+"' "$f" | head -20
echo "--- hosts ---"
grep -oE 'https?://[^/\" ]+' "$f" | sed 's|https\?://||' | cut -d/ -f1 | sort | uniq -c | sort -rn | head
