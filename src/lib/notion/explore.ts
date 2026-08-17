import {
  EXPLORE_DATABASE_ID,
  EXPLORE_DATA_SOURCE_ID,
  USE_MOCK_CONTENT,
} from '../../server-constants'
import type { ExploreEntry } from '../interfaces'
import { MOCK_EXPLORE_ENTRIES } from '../mock-content'
import { queryAllPages, resolveDataSourceId } from './client'
import { EXPLORE_DEFAULTS } from './query-config.mjs'
import {
  firstFile,
  numberValue,
  pageCover,
  plainText,
  selectName,
} from './properties'
import type * as responses from './responses'

// 「探索」是可选内容，缺失时不能拖垮构建，
// 因此所有失败路径都只警告并回退到空数组。
let entriesCache: ExploreEntry[] | null = null

/** 取全部探索条目，按日期降序（无日期的用创建时间兜底）。 */
export async function getExploreEntries(): Promise<ExploreEntry[]> {
  if (USE_MOCK_CONTENT) {
    return MOCK_EXPLORE_ENTRIES
  }

  if (entriesCache !== null) {
    return entriesCache
  }

  if (!EXPLORE_DATA_SOURCE_ID && !EXPLORE_DATABASE_ID) {
    entriesCache = []
    return entriesCache
  }

  try {
    // 「探索」库可能同时挂着多个 data source，按名字挑而不是盲取第一个
    const dataSourceId = await resolveDataSourceId(
      EXPLORE_DATA_SOURCE_ID,
      EXPLORE_DATABASE_ID,
      '探索'
    )
    if (!dataSourceId) {
      console.warn('[explore] 未解析到探索 data source，跳过探索页内容。')
      entriesCache = []
      return entriesCache
    }

    const results = await queryAllPages(dataSourceId)
    entriesCache = results
      .map((pageObject) => _buildEntry(pageObject))
      .filter((entry) => !!entry.Name)
      .sort((a, b) => b.Date.localeCompare(a.Date))
  } catch (error: unknown) {
    console.warn('[explore] 读取探索库失败，本次构建跳过探索内容：', error)
    entriesCache = []
  }

  return entriesCache
}

/** 按「类型」分组，组内保持日期降序；分组顺序按条目数多少排。 */
export async function getExploreGroups(): Promise<
  { type: string; entries: ExploreEntry[] }[]
> {
  const entries = await getExploreEntries()
  const groups = new Map<string, ExploreEntry[]>()

  entries.forEach((entry) => {
    const type = entry.Type || '其他'
    const group = groups.get(type)
    if (group) {
      group.push(entry)
    } else {
      groups.set(type, [entry])
    }
  })

  return Array.from(groups, ([type, groupEntries]) => ({
    type,
    entries: groupEntries,
  })).sort((a, b) => b.entries.length - a.entries.length)
}

function _buildEntry(pageObject: responses.PageObject): ExploreEntry {
  const prop = pageObject.properties
  const dateProperty = prop[EXPLORE_DEFAULTS.date]

  return {
    PageId: pageObject.id,
    Name: plainText(prop[EXPLORE_DEFAULTS.title]),
    Type: selectName(prop[EXPLORE_DEFAULTS.type]),
    Status: selectName(prop[EXPLORE_DEFAULTS.status]),
    Score: numberValue(prop[EXPLORE_DEFAULTS.score]),
    Author: plainText(prop[EXPLORE_DEFAULTS.author]),
    Place: plainText(prop[EXPLORE_DEFAULTS.place]),
    Date: dateProperty?.date?.start || pageObject.created_time,
    // 封面属性优先，其次退回页面自身的 cover
    Cover:
      firstFile(prop[EXPLORE_DEFAULTS.cover]) || pageCover(pageObject) || null,
  }
}
