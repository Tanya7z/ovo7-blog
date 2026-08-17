import type { AstroIntegration } from 'astro'
import type { FileObject } from '../lib/interfaces'
import { downloadFile } from '../lib/notion/client'

type LoadImages = () => Promise<(FileObject | null | undefined)[]>

/**
 * 构建期把 Notion 托管的图片落地到 public/notion/。
 * Notion 的文件链接是带签名的 S3 地址，会过期，静态站必须自己存一份。
 *
 * 做成工厂而不是每种内容抄一遍：新增内容类型只要再注册一个实例，
 * 不用改这里的下载逻辑。
 */
export default (name: string, loadImages: LoadImages): AstroIntegration => ({
  name,
  hooks: {
    'astro:build:start': async () => {
      const images = await loadImages()

      await Promise.all(
        images.map((image) => {
          // external 图片本来就是稳定外链，不必也不该落地
          if (!image?.Url || image.Type !== 'file') {
            return Promise.resolve()
          }

          let url!: URL
          try {
            url = new URL(image.Url)
          } catch {
            console.log(`[${name}] 无效的图片地址：`, image.Url)
            return Promise.resolve()
          }

          return downloadFile(url)
        })
      )
    },
  },
})
