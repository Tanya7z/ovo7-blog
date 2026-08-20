from pathlib import Path

p = Path("/etc/ovo7-blog.env")
text = p.read_text(encoding="utf-8")
text = text.replace("MEDIA_ORIGIN=https://img.ovo7.cc", "")
if "MEDIA_ORIGIN=" not in text:
    if not text.endswith("\n"):
        text += "\n"
    text += "MEDIA_ORIGIN=https://img.ovo7.cc\n"
p.write_text(text, encoding="utf-8")
for line in p.read_text(encoding="utf-8").splitlines():
    raw = line.strip()
    if not raw or raw.startswith("#"):
        print(line)
        continue
    key, _, value = raw.partition("=")
    flag = "set" if value else "empty"
    print("%s=%s" % (key, flag))
