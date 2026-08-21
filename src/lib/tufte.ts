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

const ATTRIBUTION_LINE = /^(?:—+|–+|-+|——)\s*\S/

function isList(item: Renderable): item is List {
  return 'ListItems' in item
}

/** 空段落：Notion 文首常见占位，不计作正文。 */
export function isEmptyParagraph(block: Block): boolean {
  if (block.Type !== 'paragraph') return false
  const texts = block.Paragraph?.RichTexts ?? []
  if (texts.length === 0) return true
  return texts.every((t) => !(t.Text?.Content ?? t.PlainText ?? '').trim())
}

/**
 * 文首连续引用视为引言（epigraph）。
 * 允许跳过空段落；一遇到非引用正文块即停止。
 */
export function collectLeadingEpigraphIds(items: Renderable[]): Set<string> {
  const ids = new Set<string>()
  for (const item of items) {
    if (isList(item)) break
    if (isEmptyParagraph(item)) continue
    if (item.Type === 'quote') {
      ids.add(item.Id)
      continue
    }
    break
  }
  return ids
}

/**
 * 引言之后的第一段正文，用于首字下沉。
 * 不落在引用、空段或列表项上。
 */
export function findFirstBodyParagraphId(
  items: Renderable[],
  epigraphIds: Set<string>
): string | null {
  for (const item of items) {
    if (isList(item)) continue
    if (epigraphIds.has(item.Id)) continue
    if (isEmptyParagraph(item)) continue
    if (item.Type === 'paragraph') return item.Id
  }
  return null
}

/** 段内旁注锚点：写作时写字面量，发布时换成编号角标。 */
export const SIDENOTE_MARKER = '[*]'

export type ParagraphSegment =
  { type: 'text'; richTexts: RichText[] } | { type: 'note'; block: Block }

export type ParagraphNotePlan = {
  segments: ParagraphSegment[]
  trailingNotes: Block[]
}

function richTextChunk(rt: RichText): string {
  return rt.Text?.Content ?? rt.PlainText ?? ''
}

function joinPlain(richTexts: RichText[]): string {
  return richTexts.map(richTextChunk).join('')
}

export function countSidenoteMarkers(richTexts: RichText[]): number {
  const plain = joinPlain(richTexts)
  let count = 0
  let from = 0
  while (from < plain.length) {
    const at = plain.indexOf(SIDENOTE_MARKER, from)
    if (at === -1) break
    count += 1
    from = at + SIDENOTE_MARKER.length
  }
  return count
}

/**
 * 按 [*] 切开 RichTexts，标记本身丢弃。
 * 无标记时返回 [原数组]。
 */
export function splitRichTextsAtSidenoteMarker(
  richTexts: RichText[]
): RichText[][] {
  if (countSidenoteMarkers(richTexts) === 0) return [richTexts]

  const parts: RichText[][] = []
  let current: RichText[] = []

  const pushCurrent = () => {
    parts.push(current)
    current = []
  }

  for (const rt of richTexts) {
    // 公式/提及等无普通文本的节点不参与标记切割
    if (!rt.Text?.Content && (rt.Equation || rt.Mention)) {
      current.push(rt)
      continue
    }

    let content = richTextChunk(rt)
    while (content.length > 0) {
      const at = content.indexOf(SIDENOTE_MARKER)
      if (at === -1) {
        current.push({
          ...rt,
          PlainText: content,
          Text: rt.Text ? { ...rt.Text, Content: content } : rt.Text,
        })
        break
      }
      if (at > 0) {
        const before = content.slice(0, at)
        current.push({
          ...rt,
          PlainText: before,
          Text: rt.Text ? { ...rt.Text, Content: before } : rt.Text,
        })
      }
      pushCurrent()
      content = content.slice(at + SIDENOTE_MARKER.length)
    }
  }
  parts.push(current)
  return parts
}

function buildSegments(
  parts: RichText[][],
  inlineNotes: Block[]
): ParagraphSegment[] {
  const segments: ParagraphSegment[] = []
  let partIndex = 0

  for (let i = 0; i < inlineNotes.length; i++) {
    const before = parts[partIndex] ?? []
    if (before.length > 0) {
      segments.push({ type: 'text', richTexts: before })
    }
    partIndex += 1
    segments.push({ type: 'note', block: inlineNotes[i] })
  }

  const rest: RichText[] = []
  for (let i = partIndex; i < parts.length; i++) {
    rest.push(...(parts[i] ?? []))
  }
  if (rest.length > 0) {
    segments.push({ type: 'text', richTexts: rest })
  }

  if (segments.length === 0) {
    segments.push({ type: 'text', richTexts: [] })
  }
  return segments
}

function isNoteHost(block: Block): boolean {
  return block.Type === 'paragraph' || block.Type === 'quote'
}

function hostRichTexts(block: Block): RichText[] {
  if (block.Type === 'paragraph') return block.Paragraph?.RichTexts ?? []
  if (block.Type === 'quote') return block.Quote?.RichTexts ?? []
  return []
}

/**
 * 旁注挂载（正文段或引用块均可作宿主）：
 * - 宿主文本中的 [*] 与随后灰色 Callout 按序配对（角标落在标记处）
 * - 其余旁注/边注仍挂到上一宿主末尾（兼容旧写法）
 */
export function attachNotesToParagraphs(items: Renderable[]): {
  plansByParagraphId: Map<string, ParagraphNotePlan>
  consumedNoteIds: Set<string>
} {
  const inlineByHostId = new Map<string, Block[]>()
  const trailingByHostId = new Map<string, Block[]>()
  const markerRemaining = new Map<string, number>()
  const consumedNoteIds = new Set<string>()

  for (const item of items) {
    if (isList(item) || !isNoteHost(item)) continue
    const texts = hostRichTexts(item)
    markerRemaining.set(item.Id, countSidenoteMarkers(texts))
    inlineByHostId.set(item.Id, [])
    trailingByHostId.set(item.Id, [])
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (isList(item) || !isNoteCallout(item)) continue

    let host: Block | undefined
    for (let j = i - 1; j >= 0; j--) {
      const prev = items[j]
      if (isList(prev)) break
      if (isEmptyParagraph(prev)) continue
      if (consumedNoteIds.has(prev.Id)) continue
      if (isNoteHost(prev)) {
        host = prev
      }
      break
    }
    if (!host) continue

    const remaining = markerRemaining.get(host.Id) ?? 0
    if (isSidenoteCallout(item) && remaining > 0) {
      inlineByHostId.get(host.Id)!.push(item)
      markerRemaining.set(host.Id, remaining - 1)
    } else {
      trailingByHostId.get(host.Id)!.push(item)
    }
    consumedNoteIds.add(item.Id)
  }

  const plansByParagraphId = new Map<string, ParagraphNotePlan>()
  for (const item of items) {
    if (isList(item) || !isNoteHost(item)) continue
    const texts = hostRichTexts(item)
    const parts = splitRichTextsAtSidenoteMarker(texts)
    const inlineNotes = inlineByHostId.get(item.Id) ?? []
    const trailingNotes = trailingByHostId.get(item.Id) ?? []
    plansByParagraphId.set(item.Id, {
      segments: buildSegments(parts, inlineNotes),
      trailingNotes,
    })
  }

  return { plansByParagraphId, consumedNoteIds }
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
