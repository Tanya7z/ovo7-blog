#!/usr/bin/env node
/**
 * img.ovo7.cc 上传服务：只处理写；读由 Nginx 直接出静态文件。
 *
 * POST /api/upload          multipart 字段 file，可选 bucket / name
 * PUT  /api/upload?name=&bucket=   原始字节
 * Authorization: Bearer <token>
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.env.IMGBED_ROOT || '/var/www/img.ovo7.cc';
const TOKEN_FILE = process.env.IMGBED_TOKENS || '/etc/imgbed/tokens.json';
const PUBLIC_ORIGIN = (
  process.env.IMGBED_ORIGIN || 'https://img.ovo7.cc'
).replace(/\/$/, '');
const MAX_BYTES = Number(process.env.IMGBED_MAX_BYTES || 20 * 1024 * 1024);
const LISTEN = process.env.IMGBED_LISTEN || '127.0.0.1:3922';

const ALLOWED_EXT = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'svg',
  'ico',
  'mp3',
  'wav',
  'm4a',
  'webm',
  'pdf',
]);

function loadTokens() {
  const raw = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
  return Array.isArray(raw.tokens) ? raw.tokens : [];
}

function sniffExt(buf) {
  if (
    buf.length >= 3 &&
    buf[0] === 0x47 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46
  ) {
    return 'gif';
  }
  if (
    buf.length >= 3 &&
    buf[0] === 0xff &&
    buf[1] === 0xd8 &&
    buf[2] === 0xff
  ) {
    return 'jpg';
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return 'png';
  }
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return 'webp';
  }
  return null;
}

function extOf(name, buf) {
  const sniffed = sniffExt(buf);
  if (sniffed) {
    return sniffed;
  }
  const match = String(name || '').match(/\.([a-z0-9]+)$/i);
  const ext = match ? match[1].toLowerCase() : '';
  return ALLOWED_EXT.has(ext) ? ext : '';
}

function safeBucket(name) {
  return /^[a-z0-9][a-z0-9-]{0,31}$/.test(name || '') ? name : '';
}

function safeFilename(name) {
  const base = path
    .basename(String(name || ''))
    .replace(/[^A-Za-z0-9._-]/g, '_');
  return base.length > 0 && base !== '.' && base !== '..' ? base : '';
}

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  });
  res.end(data);
}

function auth(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    return null;
  }
  return loadTokens().find((row) => row.token === token) || null;
}

function canWrite(account, bucket) {
  const buckets = account.buckets || [];
  return buckets.includes('*') || buckets.includes(bucket);
}

function saveFile(bucket, filename, buf) {
  const dir = path.join(ROOT, bucket);
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, filename);
  fs.writeFileSync(dest, buf);
  return `${PUBLIC_ORIGIN}/${bucket}/${filename}`;
}

function hashName(buf, ext) {
  const digest = crypto
    .createHash('sha256')
    .update(buf)
    .digest('hex')
    .slice(0, 16);
  return `${digest}.${ext}`;
}

async function readBody(req, limit) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) {
      throw Object.assign(new Error('too large'), { code: 'LIMIT' });
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function parseMultipart(buf, contentType) {
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(
    contentType || ''
  );
  const boundary = boundaryMatch?.[1] || boundaryMatch?.[2];
  if (!boundary) {
    return { fields: {}, file: null };
  }
  const sep = Buffer.from(`--${boundary}`);
  const fields = {};
  let file = null;
  let start = 0;
  while (start < buf.length) {
    const from = buf.indexOf(sep, start);
    if (from < 0) {
      break;
    }
    const partStart = from + sep.length;
    if (buf.slice(partStart, partStart + 2).toString() === '--') {
      break;
    }
    const headerEnd = buf.indexOf('\r\n\r\n', partStart);
    if (headerEnd < 0) {
      break;
    }
    const next = buf.indexOf(sep, headerEnd);
    const raw = buf.slice(headerEnd + 4, next > 0 ? next - 2 : buf.length);
    const headers = buf.slice(partStart, headerEnd).toString('utf8');
    const nameMatch = /name="([^"]+)"/.exec(headers);
    const fileMatch = /filename="([^"]*)"/.exec(headers);
    const name = nameMatch?.[1] || '';
    if (fileMatch) {
      file = { name: fileMatch[1], buf: raw };
    } else {
      fields[name] = raw.toString('utf8');
    }
    start = next > 0 ? next : buf.length;
  }
  return { fields, file };
}

function store({ account, bucketHint, filenameHint, buf }) {
  const bucket = safeBucket(bucketHint || account.defaultBucket || '');
  if (!bucket) {
    return { error: '需要合法 bucket（小写字母数字和短横线）', status: 400 };
  }
  if (!canWrite(account, bucket)) {
    return { error: `这个 token 不能写 ${bucket}`, status: 403 };
  }
  const ext = extOf(filenameHint, buf);
  if (!ext || !ALLOWED_EXT.has(ext)) {
    return { error: '不支持的文件类型', status: 415 };
  }
  const wanted = safeFilename(filenameHint);
  const filename = wanted && path.extname(wanted) ? wanted : hashName(buf, ext);
  const url = saveFile(bucket, filename, buf);
  return { url, bucket, name: filename };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    json(res, 204, {});
    return;
  }

  const url = new URL(req.url || '/', 'http://127.0.0.1');
  if (req.method === 'GET' && url.pathname === '/api/health') {
    json(res, 200, { ok: true });
    return;
  }

  if (
    !(req.method === 'POST' && url.pathname === '/api/upload') &&
    !(req.method === 'PUT' && url.pathname === '/api/upload')
  ) {
    json(res, 404, { error: 'not found' });
    return;
  }

  const account = auth(req);
  if (!account) {
    json(res, 401, { error: '需要 Authorization: Bearer <token>' });
    return;
  }

  try {
    const buf = await readBody(req, MAX_BYTES);
    let filenameHint = url.searchParams.get('name') || '';
    let bucketHint = url.searchParams.get('bucket') || '';
    let payload = buf;

    const type = req.headers['content-type'] || '';
    if (req.method === 'POST' && type.includes('multipart/form-data')) {
      const parsed = parseMultipart(buf, type);
      bucketHint = parsed.fields.bucket || bucketHint;
      filenameHint = parsed.fields.name || parsed.file?.name || filenameHint;
      payload = parsed.file?.buf || Buffer.alloc(0);
    }

    if (!payload.length) {
      json(res, 400, { error: '没有文件' });
      return;
    }

    const result = store({
      account,
      bucketHint,
      filenameHint,
      buf: payload,
    });
    if (result.error) {
      json(res, result.status, { success: false, error: result.error });
      return;
    }
    json(res, 200, {
      success: true,
      url: result.url,
      bucket: result.bucket,
      name: result.name,
    });
  } catch (err) {
    if (err.code === 'LIMIT') {
      json(res, 413, { error: '文件太大' });
      return;
    }
    console.error(err);
    json(res, 500, { error: '写入失败' });
  }
});

const [host, port] = LISTEN.split(':');
server.listen(Number(port), host, () => {
  console.log(`imgbed listening on ${LISTEN}, root ${ROOT}`);
});
