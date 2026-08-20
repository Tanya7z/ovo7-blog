#!/bin/bash
# 给含空格的值加引号，避免 source / EnvironmentFile 拆词
python3 - <<'PY'
from pathlib import Path
p = Path('/etc/ovo7-blog.env')
out = []
for line in p.read_text(encoding='utf-8').splitlines():
    raw = line.strip()
    if not raw or raw.startswith('#') or '=' not in raw:
        out.append(line)
        continue
    key, _, val = raw.partition('=')
    if val.startswith(('"', "'")):
        out.append(f'{key}={val}')
        continue
    if any(ch in val for ch in ' \t#'):
        out.append(f'{key}="{val}"')
    else:
        out.append(f'{key}={val}')
p.write_text('\n'.join(out) + '\n', encoding='utf-8')
print('quoted ok')
for line in p.read_text(encoding='utf-8').splitlines():
    if line.startswith('SITE_') or line.startswith('MEDIA_'):
        print(line)
PY
