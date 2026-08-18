import {
  MUSIC_AUDIO_PROPERTY,
  MUSIC_COMPOSER_PROPERTY,
  MUSIC_DATABASE_ID,
  MUSIC_DATA_SOURCE_ID,
  MUSIC_ENABLED_PROPERTY,
  MUSIC_ORDER_PROPERTY,
  MUSIC_TITLE_PROPERTY,
  USE_MOCK_CONTENT,
} from '../../server-constants'
import type { Track } from '../interfaces'
import { MOCK_TRACKS } from '../mock-content'
import { queryAllPages, resolveDataSourceId } from './client'
import { firstFile, numberValue, plainText } from './properties'
import type * as responses from './responses'

// 「曲库」是可选装饰，缺失时博客必须照常构建，
// 因此本模块的所有失败路径都只警告并回退到空数组（播放器随之不渲染）。
let tracksCache: Track[] | null = null

/** 取全部已启用的曲目，按「排序」升序。 */
export async function getTracks(): Promise<Track[]> {
  if (USE_MOCK_CONTENT) {
    return MOCK_TRACKS
  }

  if (tracksCache !== null) {
    return tracksCache
  }

  if (!MUSIC_DATA_SOURCE_ID && !MUSIC_DATABASE_ID) {
    tracksCache = []
    return tracksCache
  }

  try {
    const dataSourceId = await resolveDataSourceId(
      MUSIC_DATA_SOURCE_ID,
      MUSIC_DATABASE_ID,
      '曲库'
    )
    if (!dataSourceId) {
      console.warn('[music] 未解析到曲库 data source，跳过播放器。')
      tracksCache = []
      return tracksCache
    }

    const results = await queryAllPages(dataSourceId, {
      filter: {
        property: MUSIC_ENABLED_PROPERTY,
        checkbox: { equals: true },
      },
      sorts: [{ property: MUSIC_ORDER_PROPERTY, direction: 'ascending' }],
    })

    tracksCache = results
      .map((pageObject) => _buildTrack(pageObject))
      // 没上传音频的行只是占位，不能进播放列表
      .filter((track) => !!track.Audio?.Url && !!track.Name)
      .sort((a, b) => a.Order - b.Order)
  } catch (error: unknown) {
    console.warn('[music] 读取曲库失败，本次构建跳过播放器：', error)
    tracksCache = []
  }

  return tracksCache
}

function _buildTrack(pageObject: responses.PageObject): Track {
  const prop = pageObject.properties

  return {
    PageId: pageObject.id,
    Name: plainText(prop[MUSIC_TITLE_PROPERTY]),
    Composer: plainText(prop[MUSIC_COMPOSER_PROPERTY]),
    Order: numberValue(prop[MUSIC_ORDER_PROPERTY]) ?? 0,
    Audio: firstFile(prop[MUSIC_AUDIO_PROPERTY]),
  }
}
