import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { REQUEST_TIMEOUT_MS } from '../server-constants'
import { mediaPath } from './media-url'
import {
  sniffImageExt,
  withRealImageExt,
  type ImageExt,
} from './notion/media-file'

const MIRROR_ROOT = './public/mirror'

/** 外链图片的本地镜像目录键（SHA-256 前 20 位，稳定可复现）。 */
export function mirrorStorageKey(url: string): string {
  return crypto.createHash('sha256').update(url).digest('hex').slice(0, 20)
}

function mirrorFolder(): string {
  if (!fs.existsSync(MIRROR_ROOT)) {
    fs.mkdirSync(MIRROR_ROOT, { recursive: true })
  }
  return MIRROR_ROOT
}

/** 在 mirror 目录里查找已落地的文件（扩展名可能与 URL 不一致）。 */
export function findMirroredFilename(url: string): string | null {
  const key = mirrorStorageKey(url)
  if (!fs.existsSync(MIRROR_ROOT)) {
    return null
  }
  const files = fs
    .readdirSync(MIRROR_ROOT)
    .filter((name) => name.startsWith(`${key}.`) && !name.startsWith('.'))
  if (files.length === 0) {
    return null
  }
  return files[0]
}

/** 本地已有非空镜像时返回 true。 */
export function mirroredAssetReady(url: string): boolean {
  const filename = findMirroredFilename(url)
  if (!filename) {
    return false
  }
  try {
    const filepath = path.join(MIRROR_ROOT, filename)
    return fs.existsSync(filepath) && fs.statSync(filepath).size > 0
  } catch {
    return false
  }
}

/** 页面里用的站内路径；未镜像时返回空串。 */
export function mirroredAssetPublicPath(url: string): string {
  const filename = findMirroredFilename(url)
  if (!filename) {
    return ''
  }
  return mediaPath(`/mirror/${filename}`)
}

function guessExtFromUrl(url: URL): ImageExt {
  const match = url.pathname.match(/\.(jpe?g|png|gif|webp)$/i)
  if (!match) {
    return 'jpg'
  }
  const raw = match[1].toLowerCase()
  if (raw === 'jpeg') {
    return 'jpg'
  }
  return raw as ImageExt
}

function isRetryable(err: unknown): boolean {
  const code =
    (err as { code?: string }).code ||
    (err as { cause?: { code?: string } }).cause?.code
  return (
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'EPIPE' ||
    code === 'UND_ERR_SOCKET' ||
    code === 'UND_ERR_ABORTED'
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 构建期把外链图片（Bangumi / IMDB 等）拉到 public/mirror/，
 * 页面走同域静态文件，国内访问不依赖境外 CDN。
 */
export async function downloadMirroredAsset(url: URL): Promise<void> {
  if (mirroredAssetReady(url.toString())) {
    return
  }

  const timeoutMs = Math.max(REQUEST_TIMEOUT_MS, 60000)
  const maxAttempts = 3
  let buf: Buffer | undefined

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url.toString(), {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Accept: 'image/*,*/*',
          'User-Agent': 'ovo7-blog/0.12.0 (build-mirror)',
        },
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      buf = Buffer.from(await res.arrayBuffer())
      break
    } catch (err) {
      if (isRetryable(err) && attempt < maxAttempts) {
        console.log(
          `[mirror] 下载中断，${400 * attempt}ms 后重试 ${url.hostname}${url.pathname}`
        )
        await sleep(400 * attempt)
        continue
      }
      console.log(`[mirror] 放弃 ${url.toString()}：`, err)
      return
    } finally {
      clearTimeout(timeoutId)
    }
  }

  if (!buf || buf.length === 0) {
    return
  }

  const key = mirrorStorageKey(url.toString())
  const sniffed = sniffImageExt(buf)
  const ext = sniffed || guessExtFromUrl(url)
  const filename = withRealImageExt(`${key}.${ext}`, buf)
  const filepath = path.join(mirrorFolder(), filename)

  try {
    await fs.promises.writeFile(filepath, buf)
  } catch (err) {
    console.log(`[mirror] 写入失败 ${filepath}：`, err)
  }
}
