import type { AstroIntegration } from 'astro'
import { getAllPosts, downloadFile } from '../lib/notion/client'

export default (): AstroIntegration => ({
  name: 'featured-image-downloader',
  hooks: {
    'astro:build:start': async () => {
      const posts = await getAllPosts()

      await Promise.all(
        posts.map((post) => {
          const image = post.Cover?.Url ? post.Cover : post.FeaturedImage
          if (!image || !image.Url) {
            return Promise.resolve()
          }

          let url!: URL
          try {
            url = new URL(image.Url)
          } catch {
            console.log('Invalid cover image URL: ', image.Url)
            return Promise.resolve()
          }

          return downloadFile(url)
        })
      )
    },
  },
})
