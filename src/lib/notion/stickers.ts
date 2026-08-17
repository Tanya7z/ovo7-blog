import {
  STICKER_CAPTION_PROPERTY,
  STICKER_COLLECTION_PROPERTY,
  STICKER_DATABASE_ID,
  STICKER_DATA_SOURCE_ID,
  STICKER_ENABLED_PROPERTY,
  STICKER_IMAGE_PROPERTY,
  STICKER_ORDER_PROPERTY,
  STICKER_ROTATION_PROPERTY,
  STICKER_SCALE_PROPERTY,
  STICKER_TITLE_PROPERTY,
  USE_MOCK_CONTENT,
} from '../../server-constants'
import type { Sticker } from '../interfaces'
import { MOCK_STICKERS } from '../mock-content'
import { queryAllPages, resolveDataSourceId } from './client'
import { firstFile, numberValue, plainText, selectName } from './properties'
import type * as responses from './responses'

// 「贴画」库是可选装饰，缺失时博客必须照常构建，
// 因此本模块的所有失败路径都只警告并回退到空数组。
let stickersCache: Sticker[] | null = null

/**
 * 取全部已启用的贴画（跨集合，一次查询）。
 * 集合的筛选放在内存里做，新增集合不需要多打一次 Notion。
 */
export async function getAllStickers(): Promise<Sticker[]> {
  if (USE_MOCK_CONTENT) {
    return MOCK_STICKERS
  }

  if (stickersCache !== null) {
    return stickersCache
  }

  if (!STICKER_DATA_SOURCE_ID && !STICKER_DATABASE_ID) {
    stickersCache = []
    return stickersCache
  }

  try {
    const dataSourceId = await resolveDataSourceId(
      STICKER_DATA_SOURCE_ID,
      STICKER_DATABASE_ID,
      '贴画'
    )
    if (!dataSourceId) {
      console.warn('[stickers] 未解析到贴画 data source，跳过贴画渲染。')
      stickersCache = []
      return stickersCache
    }

    const results = await queryAllPages(dataSourceId, {
      filter: {
        property: STICKER_ENABLED_PROPERTY,
        checkbox: { equals: true },
      },
      sorts: [{ property: STICKER_ORDER_PROPERTY, direction: 'ascending' }],
    })

    stickersCache = results
      .map((pageObject) => _buildSticker(pageObject))
      .filter((sticker) => !!sticker.Image?.Url)
      .sort((a, b) => a.Order - b.Order)
  } catch (error: unknown) {
    console.warn('[stickers] 读取贴画库失败，本次构建跳过贴画：', error)
    stickersCache = []
  }

  return stickersCache
}

/** 取某个集合的贴画；集合名就是 Notion「集合」里的选项，新增无需改代码。 */
export async function getStickers(collection: string): Promise<Sticker[]> {
  const allStickers = await getAllStickers()
  if (!collection) {
    return allStickers
  }
  return allStickers.filter((sticker) => sticker.Collection === collection)
}

function _buildSticker(pageObject: responses.PageObject): Sticker {
  const prop = pageObject.properties

  return {
    PageId: pageObject.id,
    Name: plainText(prop[STICKER_TITLE_PROPERTY]),
    Collection: selectName(prop[STICKER_COLLECTION_PROPERTY]),
    Caption: plainText(prop[STICKER_CAPTION_PROPERTY]),
    Rotation: numberValue(prop[STICKER_ROTATION_PROPERTY]),
    Scale: numberValue(prop[STICKER_SCALE_PROPERTY]),
    Order: numberValue(prop[STICKER_ORDER_PROPERTY]) ?? 0,
    Image: firstFile(prop[STICKER_IMAGE_PROPERTY]),
    Created: pageObject.created_time,
  }
}
