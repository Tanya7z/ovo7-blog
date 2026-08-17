/**
 * 首页贴画的随机散落排布。
 *
 * 每次完整刷新换一颗种子；同一次页面生命周期里窗口缩放只重新适配，
 * 不会无故换构图。算法是「大的先贴 + 候选点打分」：
 * 互相严重遮挡、挤成一团、全偏一侧会重罚；压住链接也重罚；
 * 压住正文只轻罚；略微伸出屏幕反而加一点分，才像随手贴上的。
 */

const MOBILE_MQ = '(max-width: 920px)'
const CANDIDATE_COUNT = 28
const FALLBACK_MS = 1200
/** 窄屏叠在版心上的贴纸上限，避免挤成一团 */
const MOBILE_MAX_STICKERS = 4
const MOBILE_NARROW_MAX_STICKERS = 3

interface Box {
  x: number
  y: number
  w: number
  h: number
}

interface Placement {
  x: number
  y: number
  rotate: number
  z: number
  col?: number
  order?: number
  lockRotate: boolean
}

const boardSeeds = new WeakMap<HTMLElement, number>()
let didBind = false
let resizeTimer = 0

/** 用加密随机数生成种子；没有 crypto 时退回时间戳。 */
export function newSeed(): number {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    return buf[0] || (Date.now() >>> 0)
  }
  return Date.now() >>> 0
}

/** Mulberry32：同一颗种子永远走出同一串随机数。 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function overlapArea(a: Box, b: Box): number {
  const x = Math.max(
    0,
    Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  )
  const y = Math.max(
    0,
    Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  )
  return x * y
}

function centerDist(a: Box, b: Box): number {
  return Math.hypot(
    a.x + a.w / 2 - (b.x + b.w / 2),
    a.y + a.h / 2 - (b.y + b.h / 2)
  )
}

function localBox(el: Element, origin: DOMRect): Box {
  const r = el.getBoundingClientRect()
  return {
    x: r.left - origin.left,
    y: r.top - origin.top,
    w: r.width,
    h: r.height,
  }
}

/** 旋转后的外接矩形，用来算真实遮挡而不是轴对齐的相纸盒子。 */
function rotatedAabb(x: number, y: number, w: number, h: number, deg: number): Box {
  const rad = (deg * Math.PI) / 180
  const sin = Math.abs(Math.sin(rad))
  const cos = Math.abs(Math.cos(rad))
  const rw = w * cos + h * sin
  const rh = w * sin + h * cos
  return {
    x: x + (w - rw) / 2,
    y: y + (h - rh) / 2,
    w: rw,
    h: rh,
  }
}

function randomRotate(rng: () => number, scale = 1): number {
  const mag = (2.2 + rng() * 7.8) * scale
  return (rng() < 0.5 ? -1 : 1) * mag
}

function readLockedRotate(el: HTMLElement): number {
  const raw = getComputedStyle(el).getPropertyValue('--rotate').trim()
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) ? n : 0
}

function isRotateLocked(el: HTMLElement): boolean {
  return el.hasAttribute('data-locked-rotate')
}

function polaroidSize(el: HTMLElement): { w: number; h: number } {
  const figure = el.querySelector('.polaroid')
  if (figure instanceof HTMLElement && figure.offsetWidth > 0) {
    return { w: figure.offsetWidth, h: figure.offsetHeight }
  }
  return { w: el.offsetWidth || 120, h: el.offsetHeight || 140 }
}

function applyPlacement(el: HTMLElement, p: Placement): void {
  el.style.setProperty('--scatter-x', `${p.x.toFixed(1)}px`)
  el.style.setProperty('--scatter-y', `${p.y.toFixed(1)}px`)
  el.style.setProperty('--sticker-z', String(p.z))
  if (!p.lockRotate) {
    el.style.setProperty('--rotate', `${p.rotate.toFixed(2)}deg`)
  }
  if (p.col != null) {
    el.style.setProperty('--scatter-col', String(p.col))
  } else {
    el.style.removeProperty('--scatter-col')
  }
  if (p.order != null) {
    el.style.setProperty('--scatter-order', String(p.order))
  } else {
    el.style.removeProperty('--scatter-order')
  }
}

function shuffleInPlace<T>(list: T[], rng: () => number): void {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const current = list[i]
    const swapped = list[j]
    if (current === undefined || swapped === undefined) {
      continue
    }
    list[i] = swapped
    list[j] = current
  }
}

interface DesktopContext {
  sheet: { w: number; h: number }
  view: Box
  links: Box[]
  content: Box[]
  title: Box | null
  cards: Box[]
}

function collectDesktopContext(board: HTMLElement): DesktopContext {
  const origin = board.getBoundingClientRect()
  const sheet = { w: origin.width, h: origin.height }
  const view: Box = {
    x: -origin.left,
    y: -origin.top,
    w: window.innerWidth,
    h: window.innerHeight,
  }

  const sheetEl = board.closest('.sheet') ?? board.parentElement
  const links: Box[] = []
  const content: Box[] = []
  const cards: Box[] = []
  let title: Box | null = null

  if (sheetEl) {
    sheetEl.querySelectorAll('a, button').forEach((el) => {
      if (el.closest('.sticker')) {
        return
      }
      links.push(localBox(el, origin))
    })
    sheetEl.querySelectorAll('h1, h2, .motto, .pinboard, .entries, .page-icon').forEach((el) => {
      content.push(localBox(el, origin))
    })
    const heading = sheetEl.querySelector('h1')
    if (heading) {
      title = localBox(heading, origin)
    }
    sheetEl.querySelectorAll('.pinboard > *').forEach((el) => {
      cards.push(localBox(el, origin))
    })
  }

  return { sheet, view, links, content, title, cards }
}

function generateDesktopCandidates(
  size: { w: number; h: number },
  ctx: DesktopContext,
  rng: () => number
): Array<{ x: number; y: number }> {
  const { w, h } = size
  const { sheet, title, cards } = ctx
  const points: Array<{ x: number; y: number }> = []

  const pushZone = (n: number, pick: () => { x: number; y: number }) => {
    for (let i = 0; i < n; i++) {
      points.push(pick())
    }
  }

  const yRange = () => lerp(-h * 0.18, Math.max(8, sheet.h - h * 0.28), rng())

  // 左纸边：大部分在版心外，偶尔压进一点
  pushZone(8, () => ({
    x: lerp(-w * 0.88, w * 0.24, rng()),
    y: yRange(),
  }))
  // 右纸边
  pushZone(8, () => ({
    x: lerp(sheet.w - w * 0.24, sheet.w + w * 0.58, rng()),
    y: yRange(),
  }))
  // 标题附近
  if (title) {
    pushZone(4, () => ({
      x: lerp(title.x + title.w * 0.35, title.x + title.w + 48, rng()),
      y: lerp(title.y - h * 0.45, title.y + title.h * 0.8, rng()),
    }))
  }
  // 卡片边角：压住一点点才像手帐
  for (const card of cards) {
    pushZone(2, () => {
      const corners = [
        { x: card.x - w * 0.45, y: card.y - h * 0.28 },
        { x: card.x + card.w - w * 0.55, y: card.y - h * 0.22 },
        { x: card.x - w * 0.38, y: card.y + card.h - h * 0.58 },
        { x: card.x + card.w - w * 0.62, y: card.y + card.h - h * 0.42 },
      ]
      const picked = corners[Math.floor(rng() * corners.length)] ?? corners[0]
      return {
        x: (picked?.x ?? 0) + (rng() - 0.5) * 36,
        y: (picked?.y ?? 0) + (rng() - 0.5) * 28,
      }
    })
  }
  // 版心内空白
  pushZone(6, () => ({
    x: lerp(-w * 0.15, sheet.w - w * 0.7, rng()),
    y: lerp(h * 0.15, sheet.h - h * 0.45, rng()),
  }))

  shuffleInPlace(points, rng)
  return points.slice(0, CANDIDATE_COUNT)
}

/**
 * 窄屏没有纸边留白：候选点放在版心内/边角，最多轻轻探出一点。
 */
function generateMobileCandidates(
  size: { w: number; h: number },
  ctx: DesktopContext,
  rng: () => number
): Array<{ x: number; y: number }> {
  const { w, h } = size
  const { sheet, title, cards } = ctx
  const points: Array<{ x: number; y: number }> = []

  const pushZone = (n: number, pick: () => { x: number; y: number }) => {
    for (let i = 0; i < n; i++) {
      points.push(pick())
    }
  }

  const yInSheet = () =>
    lerp(Math.max(4, -h * 0.08), Math.max(24, sheet.h - h * 0.42), rng())

  pushZone(7, () => ({
    x: lerp(-w * 0.22, w * 0.06, rng()),
    y: yInSheet(),
  }))
  pushZone(7, () => ({
    x: lerp(sheet.w - w * 1.06, sheet.w - w * 0.78, rng()),
    y: yInSheet(),
  }))

  if (title) {
    pushZone(4, () => ({
      x: lerp(
        Math.max(-w * 0.1, title.x - w * 0.15),
        Math.min(sheet.w - w * 0.55, title.x + title.w * 0.7),
        rng()
      ),
      y: lerp(title.y - h * 0.25, title.y + title.h * 0.9, rng()),
    }))
  }

  for (const card of cards) {
    pushZone(3, () => {
      const corners = [
        { x: card.x - w * 0.28, y: card.y - h * 0.18 },
        { x: card.x + card.w - w * 0.72, y: card.y - h * 0.15 },
        { x: card.x - w * 0.22, y: card.y + card.h - h * 0.7 },
        { x: card.x + card.w - w * 0.78, y: card.y + card.h - h * 0.55 },
      ]
      const picked = corners[Math.floor(rng() * corners.length)] ?? corners[0]
      return {
        x: (picked?.x ?? 0) + (rng() - 0.5) * 22,
        y: (picked?.y ?? 0) + (rng() - 0.5) * 18,
      }
    })
  }

  pushZone(5, () => ({
    x: lerp(-w * 0.08, sheet.w - w * 0.75, rng()),
    y: lerp(sheet.h * 0.42, sheet.h - h * 0.3, rng()),
  }))

  shuffleInPlace(points, rng)
  return points.slice(0, CANDIDATE_COUNT)
}

function scoreDesktop(
  aabb: Box,
  rotate: number,
  ctx: DesktopContext,
  placed: Box[],
  sides: { left: number; right: number },
  preferBleed = true
): number {
  const area = Math.max(1, aabb.w * aabb.h)
  let score = 0

  for (const other of placed) {
    const overlap = overlapArea(aabb, other)
    const smaller = Math.min(area, other.w * other.h)
    score += (overlap / area) * 90
    if (smaller > 0 && overlap / smaller > 0.32) {
      score += 48
    }
    const minSep = 0.52 * (Math.hypot(aabb.w, aabb.h) + Math.hypot(other.w, other.h)) / 2
    const dist = centerDist(aabb, other)
    if (dist < minSep) {
      const deficit = minSep - dist
      score += 0.12 * deficit * deficit
    }
  }

  const bandH = ctx.sheet.h / 5
  if (bandH > 0) {
    const band = Math.min(4, Math.max(0, Math.floor((aabb.y + aabb.h / 2) / bandH)))
    let inBand = 0
    for (const other of placed) {
      const otherBand = Math.min(
        4,
        Math.max(0, Math.floor((other.y + other.h / 2) / bandH))
      )
      if (otherBand === band) {
        inBand += 1
      }
    }
    if (inBand >= 2) {
      score += 18
    }
    if (inBand >= 3) {
      score += 36
    }
  }

  const cx = aabb.x + aabb.w / 2
  const goingLeft = cx < ctx.sheet.w / 2
  const nextLeft = sides.left + (goingLeft ? 1 : 0)
  const nextRight = sides.right + (goingLeft ? 0 : 1)
  const total = nextLeft + nextRight
  if (total >= 3) {
    const bias = Math.max(nextLeft, nextRight) / total
    if (bias > 0.74) {
      score += 28
    }
  }

  for (const link of ctx.links) {
    score += (overlapArea(aabb, link) / area) * 160
  }
  for (const block of ctx.content) {
    score += (overlapArea(aabb, block) / area) * 18
  }
  if (ctx.title) {
    score += (overlapArea(aabb, ctx.title) / area) * 42
  }

  const overflowX =
    Math.max(0, ctx.view.x - aabb.x) +
    Math.max(0, aabb.x + aabb.w - (ctx.view.x + ctx.view.w))
  const overflowY =
    Math.max(0, ctx.view.y - aabb.y) +
    Math.max(0, aabb.y + aabb.h - (ctx.view.y + ctx.view.h))
  const overflowArea =
    overflowX * aabb.h * 0.35 + overflowY * aabb.w * 0.15
  score += (overflowArea / area) * (preferBleed ? 6 : 22)
  if (overflowArea / area > 0.45) {
    score += preferBleed ? 14 : 40
  }

  // 桌面喜欢挂在纸边外；窄屏几乎没有边，探出太多会被裁掉
  const hangsOffPaper = aabb.x < -8 || aabb.x + aabb.w > ctx.sheet.w + 8
  if (preferBleed) {
    if (hangsOffPaper) {
      score -= 18
    }
  } else {
    const outLeft = Math.max(0, -aabb.x)
    const outRight = Math.max(0, aabb.x + aabb.w - ctx.sheet.w)
    const outTop = Math.max(0, -aabb.y)
    const outBottom = Math.max(0, aabb.y + aabb.h - ctx.sheet.h)
    score += (outLeft + outRight) * 0.55 + (outTop + outBottom) * 0.35
    if (hangsOffPaper) {
      score += 24
    }
  }
  for (const card of ctx.cards) {
    const corner = overlapArea(aabb, card) / area
    if (corner > 0.04 && corner < 0.28) {
      score -= 10
      break
    }
  }

  // 轻微偏好「有一点歪」，太平了不像手帐
  score += Math.max(0, 3 - Math.abs(rotate)) * 1.4

  return score
}

function layoutDesktop(
  board: HTMLElement,
  items: HTMLElement[],
  rng: () => number
): void {
  clearMobileParked(items)
  const ctx = collectDesktopContext(board)
  const ranked = items
    .map((el) => {
      const size = polaroidSize(el)
      return { el, size, area: size.w * size.h }
    })
    .sort((a, b) => b.area - a.area)

  const placed: Box[] = []
  const sides = { left: 0, right: 0 }

  for (const item of ranked) {
    const lockRotate = isRotateLocked(item.el)
    const rotate = lockRotate ? readLockedRotate(item.el) : randomRotate(rng)
    const candidates = generateDesktopCandidates(item.size, ctx, rng)
    let best = candidates[0] ?? { x: -item.size.w * 0.4, y: rng() * ctx.sheet.h * 0.6 }
    let bestScore = Number.POSITIVE_INFINITY

    for (const point of candidates) {
      const aabb = rotatedAabb(point.x, point.y, item.size.w, item.size.h, rotate)
      const score = scoreDesktop(aabb, rotate, ctx, placed, sides)
      if (score < bestScore) {
        best = point
        bestScore = score
      }
    }

    const aabb = rotatedAabb(best.x, best.y, item.size.w, item.size.h, rotate)
    placed.push(aabb)
    if (aabb.x + aabb.w / 2 < ctx.sheet.w / 2) {
      sides.left += 1
    } else {
      sides.right += 1
    }

    applyPlacement(item.el, {
      x: best.x,
      y: best.y,
      rotate,
      z: 2 + Math.floor(rng() * 6),
      lockRotate,
    })
  }
}

function clearMobileParked(items: HTMLElement[]): void {
  for (const el of items) {
    el.classList.remove('is-mobile-parked')
    el.removeAttribute('aria-hidden')
  }
}

function parkMobileExtras(
  items: HTMLElement[],
  rng: () => number
): HTMLElement[] {
  const cap =
    window.innerWidth < 560 ? MOBILE_NARROW_MAX_STICKERS : MOBILE_MAX_STICKERS
  clearMobileParked(items)
  if (items.length <= cap) {
    return items
  }

  const order = items.map((_, i) => i)
  shuffleInPlace(order, rng)
  const keep = new Set(order.slice(0, cap))
  const visible: HTMLElement[] = []

  items.forEach((el, i) => {
    if (keep.has(i)) {
      visible.push(el)
      return
    }
    el.classList.add('is-mobile-parked')
    el.setAttribute('aria-hidden', 'true')
  })

  return visible
}

function layoutMobile(
  board: HTMLElement,
  items: HTMLElement[],
  rng: () => number
): void {
  const visible = parkMobileExtras(items, rng)
  const ctx = collectDesktopContext(board)
  const rotateScale = window.innerWidth < 560 ? 0.55 : 0.75
  const ranked = visible
    .map((el) => {
      const size = polaroidSize(el)
      return { el, size, area: size.w * size.h }
    })
    .sort((a, b) => b.area - a.area)

  const placed: Box[] = []
  const sides = { left: 0, right: 0 }

  for (const item of ranked) {
    const lockRotate = isRotateLocked(item.el)
    const rotate = lockRotate
      ? readLockedRotate(item.el)
      : randomRotate(rng, rotateScale)
    const candidates = generateMobileCandidates(item.size, ctx, rng)
    let best =
      candidates[0] ?? {
        x: rng() * Math.max(8, ctx.sheet.w - item.size.w),
        y: rng() * Math.max(8, ctx.sheet.h * 0.55),
      }
    let bestScore = Number.POSITIVE_INFINITY

    for (const point of candidates) {
      const aabb = rotatedAabb(
        point.x,
        point.y,
        item.size.w,
        item.size.h,
        rotate
      )
      const score = scoreDesktop(aabb, rotate, ctx, placed, sides, false)
      if (score < bestScore) {
        best = point
        bestScore = score
      }
    }

    const aabb = rotatedAabb(best.x, best.y, item.size.w, item.size.h, rotate)
    placed.push(aabb)
    if (aabb.x + aabb.w / 2 < ctx.sheet.w / 2) {
      sides.left += 1
    } else {
      sides.right += 1
    }

    applyPlacement(item.el, {
      x: best.x,
      y: best.y,
      rotate,
      z: 2 + Math.floor(rng() * 6),
      lockRotate,
    })
  }
}

export function layoutBoard(board: HTMLElement, seed: number): void {
  const rng = mulberry32(seed)
  const items = [...board.querySelectorAll<HTMLElement>(':scope > .sticker:not(.is-falling)')]
  if (items.length === 0) {
    return
  }

  if (window.matchMedia(MOBILE_MQ).matches) {
    layoutMobile(board, items, rng)
  } else {
    layoutDesktop(board, items, rng)
  }
}

function layoutAll(boards: NodeListOf<HTMLElement>): void {
  for (const board of boards) {
    let seed = boardSeeds.get(board)
    if (seed == null) {
      seed = newSeed()
      boardSeeds.set(board, seed)
    }
    try {
      layoutBoard(board, seed)
      board.classList.add('is-laid-out')
      board.classList.remove('is-fallback')
    } catch (error: unknown) {
      console.warn('[sticker-layout] 排布失败，回退到固定描点', error)
      board.classList.add('is-fallback')
      board.classList.remove('is-laid-out')
    }
  }
}

/**
 * 扫描页面上带 data-random-layout 的贴画板并开始排布。
 * 探索页的成排贴画没有这个标记，因此不会被碰到。
 * 监听 astro:page-load，以便 ClientRouter 回到首页时重新排布。
 */
export function initScatterLayout(): void {
  if (didBind) {
    return
  }
  didBind = true

  const schedule = () => {
    const boards = document.querySelectorAll<HTMLElement>('[data-random-layout]')
    if (boards.length === 0) {
      return
    }
    requestAnimationFrame(() => layoutAll(boards))
    window.setTimeout(() => {
      for (const board of boards) {
        if (
          !board.classList.contains('is-laid-out') &&
          !board.classList.contains('is-fallback')
        ) {
          board.classList.add('is-fallback')
        }
      }
    }, FALLBACK_MS)
  }

  document.addEventListener('astro:page-load', schedule)
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(schedule, 140)
  })
}
