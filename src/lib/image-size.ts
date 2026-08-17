import fs from 'node:fs'
import sharp from 'sharp'
import { resolveNotionFilename } from './notion/media-file'

export interface ImageSize {
  width: number
  height: number
}

// 同一张图可能被多个页面渲染，读一次就够了
const sizeCache = new Map<string, ImageSize | null>()

/**
 * 把图片地址换算成它在 public/ 下的落地路径。
 *
 * 两种来源：
 * - 站内静态文件（mock 与本地素材），形如 /logo.png
 * - Notion 托管文件，构建期由 notion-media-downloader 落到 public/notion/<dir>/<file>
 */
function _resolvePublicPath(url: string): string | null {
  if (!url) {
    return null
  }

  if (url.startsWith('/')) {
    return `./public${decodeURIComponent(url)}`
  }

  try {
    const parsed = new URL(url)
    const [dir, filename] = parsed.pathname.split('/').slice(-2)
    const resolved = resolveNotionFilename(dir, decodeURIComponent(filename))
    return `./public/notion/${dir}/${resolved}`
  } catch {
    return null
  }
}

/**
 * 读取图片原始尺寸。
 *
 * 只读已落地到 public/ 的文件，不发网络请求；
 * 开发模式下图片还没下载，这里返回 null，调用方需要能接受「读不到尺寸」。
 */
export async function getImageSize(url: string): Promise<ImageSize | null> {
  const path = _resolvePublicPath(url)
  if (!path) {
    return null
  }

  const cached = sizeCache.get(path)
  if (cached !== undefined) {
    return cached
  }

  let size: ImageSize | null = null
  try {
    if (fs.existsSync(path)) {
      const metadata = await sharp(path).metadata()
      if (metadata.width && metadata.height) {
        size = { width: metadata.width, height: metadata.height }
      }
    }
  } catch (error: unknown) {
    console.warn(`[image-size] 读取图片尺寸失败，跳过：${path}`, error)
  }

  sizeCache.set(path, size)
  return size
}
