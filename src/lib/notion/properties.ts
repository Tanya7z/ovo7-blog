import type { FileObject } from '../interfaces'
import type * as responses from './responses'

// Notion 页面属性的读取helper：贴画与探索共用，避免各自抄一份解析。
export type PageProperty = responses.PageObject['properties'][string]

/** title / rich_text 属性拼成纯文本。 */
export function plainText(property: PageProperty | undefined): string {
  const richTexts = property?.title || property?.rich_text
  if (!richTexts) {
    return ''
  }
  return richTexts.map((richText) => richText.plain_text).join('')
}

/** select / status 属性取选项名。 */
export function selectName(property: PageProperty | undefined): string {
  return property?.select?.name || property?.status?.name || ''
}

/** number 属性；未填时返回 null 而不是 0，便于区分「没评分」与「评 0 分」。 */
export function numberValue(property: PageProperty | undefined): number | null {
  return typeof property?.number === 'number' ? property.number : null
}

/** files 属性取第一个文件；external 与 Notion 托管文件都要能取到。 */
export function firstFile(
  property: PageProperty | undefined
): FileObject | null {
  const file = property?.files?.[0]
  if (!file) {
    return null
  }

  if (file.external) {
    return {
      Type: 'external',
      Url: file.external.url,
    }
  }
  if (file.file) {
    return {
      Type: 'file',
      Url: file.file.url,
      ExpiryTime: file.file.expiry_time,
    }
  }
  return null
}

/** 页面自带的 cover，作为「封面」属性为空时的兜底。 */
export function pageCover(pageObject: responses.PageObject): FileObject | null {
  const cover = pageObject.cover
  if (!cover) {
    return null
  }
  if (cover.type === 'external' && 'external' in cover) {
    return {
      Type: 'external',
      Url: cover.external?.url || '',
    }
  }
  if (cover.type === 'file' && 'file' in cover) {
    return {
      Type: 'file',
      Url: cover.file?.url || '',
      ExpiryTime: cover.file?.expiry_time,
    }
  }
  return null
}
