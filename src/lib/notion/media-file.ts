import fs from 'node:fs'
import path from 'node:path'

/**
 * Notion 托管文件的落地与寻址。
 *
 * Notion 常把 GIF 存成 `.jpg` 文件名，并标成 `image/jpeg`，
 * 但字节仍是 GIF89a。落地时要按魔数认真实格式，寻址时也要能
 * 从「URL 里的假扩展名」找到磁盘上的真文件。
 */

export type ImageExt = 'gif' | 'jpg' | 'png' | 'webp'

/** 看文件头判断真实图片格式；认不出就返回 null。 */
export function sniffImageExt(buf: Buffer): ImageExt | null {
  if (buf.length < 12) {
    return null
  }
  // GIF87a / GIF89a
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
    return 'gif'
  }
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'jpg'
  }
  // PNG
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return 'png'
  }
  // RIFF....WEBP
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return 'webp'
  }
  return null
}

/** Notion URL 里的文件名改成真实扩展名；认不出就原样返回。 */
export function withRealImageExt(filename: string, buf: Buffer): string {
  const ext = sniffImageExt(buf)
  if (!ext) {
    return filename
  }
  if (/\.[^.]+$/i.test(filename)) {
    return filename.replace(/\.[^.]+$/i, `.${ext}`)
  }
  return `${filename}.${ext}`
}

/**
 * 在 public/notion/<dir>/ 里找到真正落地的文件名。
 * URL 扩展名可能是错的；目录里通常只有一个附件。
 */
export function resolveNotionFilename(
  dir: string,
  filename: string,
  publicRoot = './public/notion'
): string {
  const folder = path.join(publicRoot, dir)
  const exact = path.join(folder, filename)
  if (fs.existsSync(exact)) {
    return filename
  }
  if (!fs.existsSync(folder)) {
    return filename
  }

  const files = fs
    .readdirSync(folder)
    .filter((name) => !name.startsWith('.') && fs.statSync(path.join(folder, name)).isFile())

  if (files.length === 1) {
    return files[0]
  }

  const base = filename.replace(/\.[^.]+$/i, '').toLowerCase()
  const match = files.find(
    (name) => name.replace(/\.[^.]+$/i, '').toLowerCase() === base
  )
  return match || filename
}

/** 从 Notion 文件 URL 解析 public/notion 落地路径（扩展名可能与 URL 不一致）。 */
export function notionLocalFilePath(
  url: URL,
  publicRoot = './public/notion'
): string {
  const [dir, rawName] = url.pathname.split('/').slice(-2)
  const filename = resolveNotionFilename(
    dir,
    decodeURIComponent(rawName),
    publicRoot
  )
  return path.join(publicRoot, dir, filename)
}

/** 本地已有非空附件时返回 true，便于跳过重复下载。 */
export function notionLocalFileReady(
  url: URL,
  publicRoot = './public/notion'
): boolean {
  const filepath = notionLocalFilePath(url, publicRoot)
  try {
    return fs.existsSync(filepath) && fs.statSync(filepath).size > 0
  } catch {
    return false
  }
}
