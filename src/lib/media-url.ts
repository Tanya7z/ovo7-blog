import { BASE_PATH, MEDIA_ORIGIN } from '../server-constants'
import { pathJoin } from './utils'

/**
 * 有 MEDIA_ORIGIN 时转到图床 blog 桶，否则仍是站内路径。
 */
export function mediaPath(sitePath: string): string {
  const local = pathJoin(BASE_PATH, sitePath)
  if (!MEDIA_ORIGIN) {
    return local
  }
  const rel = local.startsWith(BASE_PATH)
    ? local.slice(BASE_PATH.length) || '/'
    : local
  const suffix = rel.startsWith('/') ? rel : `/${rel}`
  return `${MEDIA_ORIGIN}/blog${suffix}`
}
