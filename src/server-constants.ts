export const NOTION_API_SECRET =
  import.meta.env.NOTION_API_SECRET || process.env.NOTION_API_SECRET || ''
export const DATABASE_ID =
  import.meta.env.DATABASE_ID || process.env.DATABASE_ID || ''
// 「🗂️ 仓库」data source
export const DATA_SOURCE_ID =
  import.meta.env.DATA_SOURCE_ID || process.env.DATA_SOURCE_ID || ''
// 「贴画」库：按集合注册贴画，未配置时博客优雅跳过
export const STICKER_DATABASE_ID =
  import.meta.env.STICKER_DATABASE_ID || process.env.STICKER_DATABASE_ID || ''
export const STICKER_DATA_SOURCE_ID =
  import.meta.env.STICKER_DATA_SOURCE_ID ||
  process.env.STICKER_DATA_SOURCE_ID ||
  ''
// 「探索」库：阅读 / 动画 / 电影等收藏条目，未配置时不生成探索页内容
export const EXPLORE_DATABASE_ID =
  import.meta.env.EXPLORE_DATABASE_ID || process.env.EXPLORE_DATABASE_ID || ''
export const EXPLORE_DATA_SOURCE_ID =
  import.meta.env.EXPLORE_DATA_SOURCE_ID ||
  process.env.EXPLORE_DATA_SOURCE_ID ||
  ''

export const SITE_TITLE =
  import.meta.env.SITE_TITLE || process.env.SITE_TITLE || '七罪的手账本'
export const SITE_DESCRIPTION =
  import.meta.env.SITE_DESCRIPTION ||
  process.env.SITE_DESCRIPTION ||
  'La vida no tiene precio.'
export const SITE_LANGUAGE =
  import.meta.env.SITE_LANGUAGE || process.env.SITE_LANGUAGE || 'zh-CN'
export const USE_MOCK_CONTENT =
  import.meta.env.MODE === 'mock' ||
  (import.meta.env.USE_MOCK_CONTENT || process.env.USE_MOCK_CONTENT) === 'true'

// 映射 Notion「仓库」字段到博客内容模型
// 默认属性名统一取自 query-config.cjs（单一真源），避免与缓存脚本各写一套
import { PROPERTY_DEFAULTS, STICKER_DEFAULTS } from './lib/notion/query-config.mjs'

export const NOTION_TITLE_PROPERTY =
  import.meta.env.NOTION_TITLE_PROPERTY ||
  process.env.NOTION_TITLE_PROPERTY ||
  PROPERTY_DEFAULTS.title
export const NOTION_SLUG_PROPERTY =
  import.meta.env.NOTION_SLUG_PROPERTY ||
  process.env.NOTION_SLUG_PROPERTY ||
  PROPERTY_DEFAULTS.slug
export const NOTION_DATE_PROPERTY =
  import.meta.env.NOTION_DATE_PROPERTY ||
  process.env.NOTION_DATE_PROPERTY ||
  PROPERTY_DEFAULTS.date
export const NOTION_TAGS_PROPERTY =
  import.meta.env.NOTION_TAGS_PROPERTY ||
  process.env.NOTION_TAGS_PROPERTY ||
  PROPERTY_DEFAULTS.tags
export const NOTION_EXCERPT_PROPERTY =
  import.meta.env.NOTION_EXCERPT_PROPERTY ||
  process.env.NOTION_EXCERPT_PROPERTY ||
  PROPERTY_DEFAULTS.excerpt
export const NOTION_FEATURED_IMAGE_PROPERTY =
  import.meta.env.NOTION_FEATURED_IMAGE_PROPERTY ||
  process.env.NOTION_FEATURED_IMAGE_PROPERTY ||
  PROPERTY_DEFAULTS.featuredImage
// 默认不过滤：公开「仓库」内全部页面；类型仅作标签
export const NOTION_FILTER_PROPERTY =
  import.meta.env.NOTION_FILTER_PROPERTY ||
  process.env.NOTION_FILTER_PROPERTY ||
  PROPERTY_DEFAULTS.filterProperty
export const NOTION_FILTER_VALUE =
  import.meta.env.NOTION_FILTER_VALUE ||
  process.env.NOTION_FILTER_VALUE ||
  PROPERTY_DEFAULTS.filterValue
export const NOTION_FILTER_TYPE =
  import.meta.env.NOTION_FILTER_TYPE ||
  process.env.NOTION_FILTER_TYPE ||
  PROPERTY_DEFAULTS.filterType
export const NOTION_SORT_PROPERTY =
  import.meta.env.NOTION_SORT_PROPERTY ||
  process.env.NOTION_SORT_PROPERTY ||
  PROPERTY_DEFAULTS.sort

export const STICKER_TITLE_PROPERTY =
  import.meta.env.STICKER_TITLE_PROPERTY ||
  process.env.STICKER_TITLE_PROPERTY ||
  STICKER_DEFAULTS.title
export const STICKER_IMAGE_PROPERTY =
  import.meta.env.STICKER_IMAGE_PROPERTY ||
  process.env.STICKER_IMAGE_PROPERTY ||
  STICKER_DEFAULTS.image
export const STICKER_COLLECTION_PROPERTY =
  import.meta.env.STICKER_COLLECTION_PROPERTY ||
  process.env.STICKER_COLLECTION_PROPERTY ||
  STICKER_DEFAULTS.collection
export const STICKER_CAPTION_PROPERTY =
  import.meta.env.STICKER_CAPTION_PROPERTY ||
  process.env.STICKER_CAPTION_PROPERTY ||
  STICKER_DEFAULTS.caption
export const STICKER_ROTATION_PROPERTY =
  import.meta.env.STICKER_ROTATION_PROPERTY ||
  process.env.STICKER_ROTATION_PROPERTY ||
  STICKER_DEFAULTS.rotation
export const STICKER_SCALE_PROPERTY =
  import.meta.env.STICKER_SCALE_PROPERTY ||
  process.env.STICKER_SCALE_PROPERTY ||
  STICKER_DEFAULTS.scale
export const STICKER_ORDER_PROPERTY =
  import.meta.env.STICKER_ORDER_PROPERTY ||
  process.env.STICKER_ORDER_PROPERTY ||
  STICKER_DEFAULTS.order
export const STICKER_ENABLED_PROPERTY =
  import.meta.env.STICKER_ENABLED_PROPERTY ||
  process.env.STICKER_ENABLED_PROPERTY ||
  STICKER_DEFAULTS.enabled

export const CUSTOM_DOMAIN =
  import.meta.env.CUSTOM_DOMAIN || process.env.CUSTOM_DOMAIN || ''
export const BASE_PATH =
  import.meta.env.BASE_PATH || process.env.BASE_PATH || ''

export const PUBLIC_GA_TRACKING_ID =
  import.meta.env.PUBLIC_GA_TRACKING_ID || process.env.PUBLIC_GA_TRACKING_ID
export const NUMBER_OF_POSTS_PER_PAGE = 10
export const REQUEST_TIMEOUT_MS = parseInt(
  import.meta.env.REQUEST_TIMEOUT_MS || process.env.REQUEST_TIMEOUT_MS || '10000',
  10
)
export const ENABLE_LIGHTBOX =
  import.meta.env.ENABLE_LIGHTBOX || process.env.ENABLE_LIGHTBOX
