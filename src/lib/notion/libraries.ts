import {
  DATABASE_ID,
  EXPLORE_DATABASE_ID,
  MUSIC_DATABASE_ID,
  STICKER_DATABASE_ID,
  USE_MOCK_CONTENT,
} from '../../server-constants'
import type {
  ExploreEntry,
  LibraryEntry,
  LibraryGroup,
  ListingLibrary,
} from '../interfaces'
import { MOCK_LISTING_LIBRARIES } from '../mock-content'
import {
  listNeighborDatabases,
  normalizeNotionId,
  queryAllPages,
} from './client'
import { LIBRARY_DEFAULTS } from './query-config.mjs'
import {
  firstFile,
  numberValue,
  pageCover,
  plainText,
  selectName,
} from './properties'
import type * as responses from './responses'

export const EXPLORE_LIBRARY_NAME = '探索'
export const EXPLORE_LIBRARY_SLUG = 'explore'

const EXCLUDED_TITLES = new Set(['仓库', '曲库', '地图', '任务跟踪器'])

let librariesCache: ListingLibrary[] | null = null

/** 探索走 /explore，其它清单库走 /l/{库名}。 */
export function librarySlug(name: string): string {
  return name === EXPLORE_LIBRARY_NAME ? EXPLORE_LIBRARY_SLUG : name
}

export function libraryPath(name: string): string {
  const slug = librarySlug(name)
  return slug === EXPLORE_LIBRARY_SLUG ? '/explore' : `/l/${slug}`
}

function matchesLibraryContract(
  properties: Record<string, { type: string }>
): boolean {
  const title = properties[LIBRARY_DEFAULTS.title]
  const image = properties[LIBRARY_DEFAULTS.image]
  const collection = properties[LIBRARY_DEFAULTS.collection]
  const enabled = properties[LIBRARY_DEFAULTS.enabled]
  if (!title || title.type !== 'title') {
    return false
  }
  if (!collection || collection.type !== 'select') {
    return false
  }
  if (!enabled || enabled.type !== 'checkbox') {
    return false
  }
  // Notion 新 schema 里单文件是 file，多文件是 files；两边都认
  if (!image || (image.type !== 'files' && image.type !== 'file')) {
    return false
  }
  return true
}

function isExcludedLibrary(databaseId: string, title: string): boolean {
  if (EXCLUDED_TITLES.has(title)) {
    return true
  }
  const id = normalizeNotionId(databaseId)
  const excludedIds = [STICKER_DATABASE_ID, DATABASE_ID, MUSIC_DATABASE_ID]
    .filter(Boolean)
    .map((value) => normalizeNotionId(value))
  return excludedIds.includes(id)
}

function _buildEntry(pageObject: responses.PageObject): LibraryEntry {
  const prop = pageObject.properties
  const dateProperty = prop[LIBRARY_DEFAULTS.date]

  return {
    PageId: pageObject.id,
    Name: plainText(prop[LIBRARY_DEFAULTS.title]),
    Collection: selectName(prop[LIBRARY_DEFAULTS.collection]),
    Status: selectName(prop[LIBRARY_DEFAULTS.status]),
    Score: numberValue(prop[LIBRARY_DEFAULTS.score]),
    Author: plainText(prop[LIBRARY_DEFAULTS.author]),
    Place: plainText(prop[LIBRARY_DEFAULTS.place]),
    Date: dateProperty?.date?.start || pageObject.created_time,
    Image:
      firstFile(prop[LIBRARY_DEFAULTS.image]) || pageCover(pageObject) || null,
  }
}

/** 按「集合」分组；标签只统计该库里实际出现过的值。 */
export function groupByCollection(entries: LibraryEntry[]): LibraryGroup[] {
  const groups = new Map<string, LibraryEntry[]>()

  entries.forEach((entry) => {
    const collection = entry.Collection || '未分类'
    const group = groups.get(collection)
    if (group) {
      group.push(entry)
    } else {
      groups.set(collection, [entry])
    }
  })

  return Array.from(groups, ([collection, groupEntries]) => ({
    collection,
    entries: groupEntries,
  })).sort((a, b) => b.entries.length - a.entries.length)
}

function toListingLibrary(input: {
  databaseId: string
  dataSourceId: string
  name: string
  description: string
  entries: LibraryEntry[]
}): ListingLibrary {
  return {
    DatabaseId: input.databaseId,
    DataSourceId: input.dataSourceId,
    Name: input.name,
    Description: input.description,
    Slug: librarySlug(input.name),
    Path: libraryPath(input.name),
    Entries: input.entries,
  }
}

async function loadLibraryEntries(
  dataSourceId: string
): Promise<LibraryEntry[]> {
  const results = await queryAllPages(dataSourceId, {
    filter: {
      property: LIBRARY_DEFAULTS.enabled,
      checkbox: { equals: true },
    },
  })

  return results
    .map((pageObject) => _buildEntry(pageObject))
    .filter((entry) => !!entry.Name)
    .sort((a, b) => b.Date.localeCompare(a.Date))
}

/**
 * 发现仓库页上符合四字段契约的清单库。
 * 贴画库契约也对得上，但用途是装饰，按 ID 排除。
 */
export async function getListingLibraries(): Promise<ListingLibrary[]> {
  if (USE_MOCK_CONTENT) {
    return MOCK_LISTING_LIBRARIES
  }

  if (librariesCache !== null) {
    return librariesCache
  }

  const seedDatabaseId = EXPLORE_DATABASE_ID || STICKER_DATABASE_ID
  if (!seedDatabaseId) {
    librariesCache = []
    return librariesCache
  }

  try {
    const neighbors = await listNeighborDatabases(seedDatabaseId)
    const matched = neighbors.filter(
      (neighbor) =>
        matchesLibraryContract(neighbor.properties) &&
        !isExcludedLibrary(neighbor.databaseId, neighbor.title)
    )

    const libraries = await Promise.all(
      matched.map(async (neighbor) => {
        let entries: LibraryEntry[] = []
        try {
          entries = await loadLibraryEntries(neighbor.dataSourceId)
        } catch (error: unknown) {
          console.warn(
            `[libraries] 读取「${neighbor.title}」条目失败，该库按空清单处理：`,
            error
          )
        }
        return toListingLibrary({
          databaseId: neighbor.databaseId,
          dataSourceId: neighbor.dataSourceId,
          name: neighbor.title,
          description: neighbor.description,
          entries,
        })
      })
    )

    libraries.sort((a, b) => {
      if (a.Name === EXPLORE_LIBRARY_NAME) return -1
      if (b.Name === EXPLORE_LIBRARY_NAME) return 1
      return a.Name.localeCompare(b.Name, 'zh-CN')
    })

    librariesCache = libraries
  } catch (error: unknown) {
    console.warn('[libraries] 发现清单库失败，本次构建跳过清单入口：', error)
    librariesCache = []
  }

  return librariesCache
}

export async function getListingLibraryBySlug(
  slug: string
): Promise<ListingLibrary | undefined> {
  const libraries = await getListingLibraries()
  return libraries.find((library) => library.Slug === slug)
}

export function exploreEntriesFromLibrary(
  library: ListingLibrary | undefined
): ExploreEntry[] {
  if (!library) {
    return []
  }
  return library.Entries.map((entry) => ({
    PageId: entry.PageId,
    Name: entry.Name,
    Type: entry.Collection,
    Status: entry.Status,
    Score: entry.Score,
    Author: entry.Author,
    Place: entry.Place,
    Date: entry.Date,
    Cover: entry.Image,
  }))
}
