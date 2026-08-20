import { PromisePool } from '@supercharge/promise-pool'
import type { AstroIntegration } from 'astro'
import type { FileObject } from '../lib/interfaces'
import { downloadMirroredAsset } from '../lib/external-asset-mirror'
import { downloadFile } from '../lib/notion/client'

type LoadImages = () => Promise<(FileObject | null | undefined)[]>

/** Notion 签名 S3 对并行连接很敏感，一次拉太多会被对端重置。 */
const DOWNLOAD_CONCURRENCY = 2

/**
 * 构建期把 Notion 托管与外链图片落地到 public/。
 * Notion 的文件链接是带签名的 S3 地址，会过期；Bangumi / IMDB 等外链在国内不稳定，
 * 镜像到同域静态目录后由 resolveNotionAssetUrl 统一解析。
 *
 * 做成工厂而不是每种内容抄一遍：新增内容类型只要再注册一个实例，
 * 不用改这里的下载逻辑。
 */
export default (name: string, loadImages: LoadImages): AstroIntegration => ({
  name,
  hooks: {
    'astro:build:start': async () => {
      const images = await loadImages()

      const notionUrls: URL[] = []
      const externalUrls: URL[] = []

      for (const image of images) {
        if (!image?.Url) {
          continue
        }
        try {
          const parsed = new URL(image.Url)
          if (image.Type === 'file') {
            notionUrls.push(parsed)
          } else if (image.Type === 'external') {
            externalUrls.push(parsed)
          }
        } catch {
          console.log(`[${name}] 无效的图片地址：`, image.Url)
        }
      }

      if (notionUrls.length === 0 && externalUrls.length === 0) {
        return
      }

      if (notionUrls.length > 0) {
        console.log(`[${name}] 开始落地 ${notionUrls.length} 个 Notion 文件…`)
        await PromisePool.withConcurrency(DOWNLOAD_CONCURRENCY)
          .for(notionUrls)
          .process(async (url) => {
            await downloadFile(url)
          })
      }

      if (externalUrls.length > 0) {
        console.log(`[${name}] 开始镜像 ${externalUrls.length} 个外链图片…`)
        await PromisePool.withConcurrency(DOWNLOAD_CONCURRENCY)
          .for(externalUrls)
          .process(async (url) => {
            await downloadMirroredAsset(url)
          })
      }
    },
  },
})
