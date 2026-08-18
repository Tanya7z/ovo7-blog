import 'dotenv/config';
import { defineConfig } from 'astro/config';
import icon from 'astro-icon';
import { CUSTOM_DOMAIN, BASE_PATH } from './src/server-constants';
import CoverImageDownloader from './src/integrations/cover-image-downloader';
import CustomIconDownloader from './src/integrations/custom-icon-downloader';
import FeaturedImageDownloader from './src/integrations/featured-image-downloader';
import NotionMediaDownloader from './src/integrations/notion-media-downloader';
import PublicNotionCopier from './src/integrations/public-notion-copier';
import { getAllStickers } from './src/lib/notion/stickers';
import { getExploreEntries } from './src/lib/notion/explore';
import { getTracks } from './src/lib/notion/music';

const getSite = function () {
  if (CUSTOM_DOMAIN) {
    return new URL(BASE_PATH, `https://${CUSTOM_DOMAIN}`).toString();
  }

  if (process.env.VERCEL && process.env.VERCEL_URL) {
    return new URL(BASE_PATH, `https://${process.env.VERCEL_URL}`).toString();
  }

  if (process.env.CF_PAGES) {
    if (process.env.CF_PAGES_BRANCH !== 'main') {
      return new URL(BASE_PATH, process.env.CF_PAGES_URL).toString();
    }

    return new URL(
      BASE_PATH,
      `https://${new URL(process.env.CF_PAGES_URL).host
        .split('.')
        .slice(1)
        .join('.')}`
    ).toString();
  }

  return new URL(BASE_PATH, 'http://localhost:4321').toString();
};

// https://astro.build/config
export default defineConfig({
  site: getSite(),
  base: BASE_PATH,
  // ClientRouter 默认也会开 prefetch；这里显式写清：悬停预取全部站内链接
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  integrations: [
    icon({
      include: {
        ph: [
          'article-light',
          'github-logo-light',
          'envelope-simple-light',
          'x-light',
          'television',
        ],
      },
    }),
    CoverImageDownloader(),
    CustomIconDownloader(),
    FeaturedImageDownloader(),
    NotionMediaDownloader('sticker-image-downloader', async () =>
      (await getAllStickers()).map((sticker) => sticker.Image)
    ),
    NotionMediaDownloader('explore-cover-downloader', async () =>
      (await getExploreEntries()).map((entry) => entry.Cover)
    ),
    // 音频同样是 Notion 托管的带签名链接，必须构建期落地；
    // downloader 只按 FileObject 工作，音频复用这一处逻辑即可
    NotionMediaDownloader('music-audio-downloader', async () =>
      (await getTracks()).map((track) => track.Audio)
    ),
    PublicNotionCopier(),
  ],
});
