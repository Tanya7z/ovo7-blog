import type { Block, List, RichText } from './interfaces'

export type FigureLayout = 'margin' | 'column' | 'fullwidth'

export type Renderable = Block | List

const FULLWIDTH_PREFIX = /^(?:\[全宽\]|全宽)(?:\s+|$)/
const COLUMN_PREFIX = /^(?:\[正文\]|正文)(?:\s+|$)/

function firstPlain(richTexts: RichText[]): string {
  if (richTexts.length === 0) return ''
  return richTexts[0].Text?.Content ?? richTexts[0].PlainText ?? ''
}

function stripFirstPrefix(richTexts: RichText[], pattern: RegExp): RichText[] {
  const first = richTexts[0]
  if (!first) return richTexts
  const content = firstPlain(richTexts)
  const stripped = content.replace(pattern, '')
  if (stripped === content) return richTexts
  if (!stripped) return richTexts.slice(1)
  return [
    {
      ...first,
      PlainText: (first.PlainText ?? content).replace(pattern, ''),
      Text: first.Text ? { ...first.Text, Content: stripped } : first.Text,
    },
    ...richTexts.slice(1),
  ]
}

/** 从 Notion 图注解析版式标记，并剥掉前缀以免显示给读者。 */
export function parseFigureCaption(richTexts: RichText[]): {
  layout: FigureLayout
  displayTexts: RichText[]
} {
  const head = firstPlain(richTexts)
  if (FULLWIDTH_PREFIX.test(head)) {
    return {
      layout: 'fullwidth',
      displayTexts: stripFirstPrefix(richTexts, FULLWIDTH_PREFIX),
    }
  }
  if (COLUMN_PREFIX.test(head)) {
    return {
      layout: 'column',
      displayTexts: stripFirstPrefix(richTexts, COLUMN_PREFIX),
    }
  }
  return { layout: 'margin', displayTexts: richTexts }
}

export function isSidenoteCallout(block: Block): boolean {
  const color = block.Callout?.Color
  return (
    block.Type === 'callout' &&
    (color === 'gray' || color === 'gray_background')
  )
}

export function isMarginNoteCallout(block: Block): boolean {
  return block.Type === 'callout' && block.Callout?.Color === 'default'
}

export function isNoteCallout(block: Block): boolean {
  return isSidenoteCallout(block) || isMarginNoteCallout(block)
}

function isList(item: Renderable): item is List {
  return 'ListItems' in item
}

/**
 * 把紧跟在段落后的旁注/边注挂到该段末尾，便于编号出现在句中。
 * 连续多条旁注会一并挂上。
 */
export function attachNotesToParagraphs(items: Renderable[]): {
  notesByParagraphId: Map<string, Block[]>
  consumedNoteIds: Set<string>
} {
  const notesByParagraphId = new Map<string, Block[]>()
  const consumedNoteIds = new Set<string>()

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (isList(item) || !isNoteCallout(item)) continue

    let host: Block | undefined
    for (let j = i - 1; j >= 0; j--) {
      const prev = items[j]
      if (isList(prev)) break
      if (consumedNoteIds.has(prev.Id)) continue
      if (prev.Type === 'paragraph') {
        host = prev
      }
      break
    }
    if (!host) continue

    const list = notesByParagraphId.get(host.Id) ?? []
    list.push(item)
    notesByParagraphId.set(host.Id, list)
    consumedNoteIds.add(item.Id)
  }

  return { notesByParagraphId, consumedNoteIds }
}

/** 按 Notion 一级标题切开，供 <section> 包裹。 */
export function groupByHeading1(items: Renderable[]): Renderable[][] {
  const groups: Renderable[][] = []
  let current: Renderable[] = []

  for (const item of items) {
    if (!isList(item) && item.Type === 'heading_1') {
      if (current.length > 0) groups.push(current)
      current = [item]
    } else {
      current.push(item)
    }
  }
  if (current.length > 0) groups.push(current)
  return groups.length > 0 ? groups : [[]]
}

const ATTRIBUTION_LINE = /^(?:—+|–+|-+|——)\s*\S/

/**
 * 引用末行若像署名（破折号开头，或很短），拆成 epigraph 的 footer。
 */
export function splitQuoteAttribution(richTexts: RichText[]): {
  body: RichText[]
  attribution: string | null
} {
  const plain = richTexts
    .map((r) => r.Text?.Content ?? r.PlainText ?? '')
    .join('')
  const nl = plain.lastIndexOf('\n')
  if (nl === -1) return { body: richTexts, attribution: null }

  const last = plain.slice(nl + 1).trim()
  if (!last || (!ATTRIBUTION_LINE.test(last) && last.length > 24)) {
    return { body: richTexts, attribution: null }
  }

  let seen = 0
  const body: RichText[] = []
  for (const rt of richTexts) {
    const chunk = rt.Text?.Content ?? rt.PlainText ?? ''
    if (seen + chunk.length <= nl) {
      body.push(rt)
      seen += chunk.length
      continue
    }
    const keep = nl - seen
    if (keep > 0) {
      const kept = chunk.slice(0, keep).replace(/\n+$/, '')
      if (kept) {
        body.push({
          ...rt,
          PlainText: kept,
          Text: rt.Text ? { ...rt.Text, Content: kept } : rt.Text,
        })
      }
    }
    break
  }

  return { body: body.length > 0 ? body : richTexts, attribution: last }
}
