export const NOTION_API_SECRET =
  import.meta.env.NOTION_API_SECRET || process.env.NOTION_API_SECRET || ''
export const DATABASE_ID =
  import.meta.env.DATABASE_ID || process.env.DATABASE_ID || ''

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

// Map the existing Chinese Notion database to the blog content model.
export const NOTION_TITLE_PROPERTY =
  import.meta.env.NOTION_TITLE_PROPERTY ||
  process.env.NOTION_TITLE_PROPERTY ||
  '名称'
export const NOTION_SLUG_PROPERTY =
  import.meta.env.NOTION_SLUG_PROPERTY ||
  process.env.NOTION_SLUG_PROPERTY ||
  ''
export const NOTION_DATE_PROPERTY =
  import.meta.env.NOTION_DATE_PROPERTY ||
  process.env.NOTION_DATE_PROPERTY ||
  '日期'
export const NOTION_TAGS_PROPERTY =
  import.meta.env.NOTION_TAGS_PROPERTY ||
  process.env.NOTION_TAGS_PROPERTY ||
  '类型'
export const NOTION_EXCERPT_PROPERTY =
  import.meta.env.NOTION_EXCERPT_PROPERTY ||
  process.env.NOTION_EXCERPT_PROPERTY ||
  ''
export const NOTION_FEATURED_IMAGE_PROPERTY =
  import.meta.env.NOTION_FEATURED_IMAGE_PROPERTY ||
  process.env.NOTION_FEATURED_IMAGE_PROPERTY ||
  '封面'
export const NOTION_RANK_PROPERTY =
  import.meta.env.NOTION_RANK_PROPERTY ||
  process.env.NOTION_RANK_PROPERTY ||
  ''
export const NOTION_FILTER_PROPERTY =
  import.meta.env.NOTION_FILTER_PROPERTY ||
  process.env.NOTION_FILTER_PROPERTY ||
  '类型'
export const NOTION_FILTER_VALUE =
  import.meta.env.NOTION_FILTER_VALUE ||
  process.env.NOTION_FILTER_VALUE ||
  '技术'
export const NOTION_FILTER_TYPE =
  import.meta.env.NOTION_FILTER_TYPE ||
  process.env.NOTION_FILTER_TYPE ||
  'select'
export const NOTION_SORT_PROPERTY =
  import.meta.env.NOTION_SORT_PROPERTY ||
  process.env.NOTION_SORT_PROPERTY ||
  '创建时间'

export const CUSTOM_DOMAIN =
  import.meta.env.CUSTOM_DOMAIN || process.env.CUSTOM_DOMAIN || '' // <- Set your costom domain if you have. e.g. alpacat.com
export const BASE_PATH =
  import.meta.env.BASE_PATH || process.env.BASE_PATH || '' // <- Set sub directory path if you want. e.g. /docs/

export const PUBLIC_GA_TRACKING_ID =
  import.meta.env.PUBLIC_GA_TRACKING_ID || process.env.PUBLIC_GA_TRACKING_ID
export const NUMBER_OF_POSTS_PER_PAGE = 10
export const REQUEST_TIMEOUT_MS = parseInt(
  import.meta.env.REQUEST_TIMEOUT_MS || process.env.REQUEST_TIMEOUT_MS || '10000',
  10
)
export const ENABLE_LIGHTBOX =
  import.meta.env.ENABLE_LIGHTBOX || process.env.ENABLE_LIGHTBOX
