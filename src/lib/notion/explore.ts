import type { ExploreEntry } from '../interfaces'
import {
  EXPLORE_LIBRARY_NAME,
  EXPLORE_LIBRARY_SLUG,
  exploreEntriesFromLibrary,
  getListingLibraries,
} from './libraries'

/**
 * 取探索库已启用条目。实现委托给清单库发现，避免再读「类型 / 封面」。
 */
export async function getExploreEntries(): Promise<ExploreEntry[]> {
  const libraries = await getListingLibraries()
  const explore = libraries.find(
    (library) =>
      library.Name === EXPLORE_LIBRARY_NAME ||
      library.Slug === EXPLORE_LIBRARY_SLUG
  )
  return exploreEntriesFromLibrary(explore)
}

/** 按「集合」分组，组内保持日期降序；分组顺序按条目数多少排。 */
export async function getExploreGroups(): Promise<
  { type: string; entries: ExploreEntry[] }[]
> {
  const entries = await getExploreEntries()
  const groups = new Map<string, ExploreEntry[]>()

  entries.forEach((entry) => {
    const type = entry.Type || '未分类'
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
