#!/bin/bash
f=/var/www/blog.ovo7.cc/current/explore/index.html
python3 - <<PY
from pathlib import Path
t = Path("$f").read_text(encoding="utf-8", errors="ignore")
print("imgbed", t.count("img.ovo7.cc/blog/mirror"))
print("lain", t.count("lain.bgm.tv"))
print("wikimedia", t.count("upload.wikimedia.org"))
print("amazon", t.count("media-amazon.com"))
print("sample", [u for u in __import__('re').findall(r'https://img\.ovo7\.cc/blog/mirror/[^\" ]+', t)][:3])
PY
