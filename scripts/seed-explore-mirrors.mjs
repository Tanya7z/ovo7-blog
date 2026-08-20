#!/usr/bin/env node
/**
 * 从线上 explore 页抽出外链封面，本机下载后推到 img.ovo7.cc/blog/mirror/，
 * 并改写服务器 HTML（阿里云直连 lain.bgm.tv 常超时）。
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const EXPLORE_URL = process.env.EXPLORE_URL || '';
const HOST = process.env.SAPI_SSH_HOST || 'aliyun';
const OUT = path.resolve('.tmp-explore-mirror');
const IMGBED = '/var/www/img.ovo7.cc/blog/mirror';

function mirrorKey(url) {
  return crypto.createHash('sha256').update(url).digest('hex').slice(0, 20);
}

function sniffExt(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpg';
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'png';
  if (buf[0] === 0x47 && buf[1] === 0x49) return 'gif';
  if (buf[0] === 0x52 && buf[8] === 0x57) return 'webp';
  return 'jpg';
}

fs.mkdirSync(OUT, { recursive: true });
let html;
if (EXPLORE_URL) {
  html = await (await fetch(EXPLORE_URL)).text();
} else {
  html = execFileSync(
    'ssh',
    [HOST, 'cat /var/www/blog.ovo7.cc/current/explore/index.html'],
    { encoding: 'utf8' }
  );
}
const urls = [
  ...new Set(
    [...html.matchAll(/https?:\/\/[^\"'\s>]+\.(?:jpe?g|png|gif|webp)/gi)].map(
      (m) => m[0]
    )
  ),
].filter(
  (url) =>
    !url.includes('img.ovo7.cc') &&
    !url.includes('blog.ovo7.cc') &&
    !url.includes('/_astro/')
);
console.log(`found ${urls.length} external covers`);

const map = [];
for (const url of urls) {
  const key = mirrorKey(url);
  process.stdout.write(`get ${key} ... `);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ovo7-blog/0.12.0 (mirror)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const name = `${key}.${sniffExt(buf)}`;
    fs.writeFileSync(path.join(OUT, name), buf);
    map.push({ url, name });
    console.log('ok', name);
  } catch (err) {
    console.log('fail', err.message || err);
  }
}

if (map.length === 0) {
  console.error('nothing downloaded');
  process.exit(1);
}

const listFile = path.join(OUT, 'files.txt');
fs.writeFileSync(listFile, map.map((m) => m.name).join('\n'));

execFileSync('scp', ['-r', OUT, `${HOST}:/tmp/explore-mirror`], {
  stdio: 'inherit',
});
execFileSync(
  'ssh',
  [
    HOST,
    `mkdir -p ${IMGBED} && cp -f /tmp/explore-mirror/* ${IMGBED}/ 2>/dev/null; chown -R www-data:www-data ${IMGBED}; find ${IMGBED} -type f | wc -l`,
  ],
  { stdio: 'inherit' }
);

const sedScript = map
  .map(({ url, name }) => {
    const from = url.replace(/[\\/&]/g, '\\$&');
    return `s|${from}|https://img.ovo7.cc/blog/mirror/${name}|g`;
  })
  .join('\n');
const sedFile = path.join(OUT, 'rewrite.sed');
fs.writeFileSync(sedFile, sedScript);
execFileSync('scp', [sedFile, `${HOST}:/tmp/explore-rewrite.sed`], {
  stdio: 'inherit',
});
execFileSync(
  'ssh',
  [
    HOST,
    `find /var/www/blog.ovo7.cc/current -name '*.html' -print0 | xargs -0 sed -i -f /tmp/explore-rewrite.sed; grep -c img.ovo7.cc/blog/mirror /var/www/blog.ovo7.cc/current/explore/index.html || true`,
  ],
  { stdio: 'inherit' }
);

console.log(`done, mirrored ${map.length}`);
