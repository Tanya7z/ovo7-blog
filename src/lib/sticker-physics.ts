/**
 * 撕掉胶带之后，相纸会在空中晃一秒，然后按刚体掉下去。
 *
 * 页脚的每个字 / 链接都是一块实体：贴纸砸上去会把它撞开，
 * 字自己也会落地、互相堆叠。渲染不走 Matter 的 Canvas，
 * 只用引擎算位置，再把 transform 写回 DOM。
 */

import Matter from 'matter-js'

const { Engine, Runner, Bodies, Body, Composite, Events } = Matter

const FALL_DELAY_MS = 1000
const MAX_SPEED = 36
const MAX_SPIN = 0.32
/** 低于此速度视为静止，避免微抖触发镜头跟随 */
const REST_SPEED = 0.18
/** 只有下落中的贴纸才值得镜头跟随 */
const FOLLOW_MIN_SPEED = 1.6
/** 用户手动滚动后，暂停自动跟镜的时长 */
const USER_SCROLL_COOLDOWN_MS = 1800
const CAT_STICKER = 0x0002
const CAT_FOOTER = 0x0004
const CAT_BOUND = 0x0008

type Kind = 'sticker' | 'footer'

interface Actor {
  body: Matter.Body
  el: HTMLElement
  w: number
  h: number
  kind: Kind
}

interface LayerBox {
  left: number
  top: number
  w: number
  h: number
  cx: number
  cy: number
}

let engine: Matter.Engine | null = null
let runner: Matter.Runner | null = null
let layer: HTMLElement | null = null
let bounds: Matter.Body[] = []
const actors: Actor[] = []
const pending = new WeakSet<HTMLElement>()
const unlockQueue = new Map<Matter.Body, Matter.Body>()
let userScrollUntil = 0
let programmaticScroll = false

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function readAngleRad(el: HTMLElement): number {
  const rotate =
    Number.parseFloat(getComputedStyle(el).getPropertyValue('--rotate')) || 0
  const slump =
    Number.parseFloat(getComputedStyle(el).getPropertyValue('--slump')) || 0
  return ((rotate + slump) * Math.PI) / 180
}

function tokenize(text: string): string[] {
  const tokens: string[] = []
  const pattern = /[A-Za-z0-9][A-Za-z0-9._@+-]*|[\u3400-\u9fff]|[^\s]/gu
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    tokens.push(match[0])
  }
  return tokens
}

function wrapTextNode(node: Text): void {
  const raw = node.nodeValue ?? ''
  if (!raw.trim()) {
    return
  }
  const frag = document.createDocumentFragment()
  for (const part of raw.split(/(\s+)/)) {
    if (/^\s+$/.test(part)) {
      frag.append(part)
      continue
    }
    for (const token of tokenize(part)) {
      const span = document.createElement('span')
      span.dataset.physicsSolid = ''
      span.textContent = token
      frag.append(span)
    }
  }
  node.parentNode?.replaceChild(frag, node)
}

function walkFooter(root: HTMLElement): void {
  const kids = [...root.childNodes]
  for (const node of kids) {
    if (node instanceof HTMLAnchorElement) {
      node.dataset.physicsSolid = ''
      continue
    }
    if (node instanceof HTMLElement) {
      walkFooter(node)
      continue
    }
    if (node instanceof Text) {
      wrapTextNode(node)
    }
  }
}

function ensureLayer(): HTMLElement {
  if (layer && layer.isConnected) {
    return layer
  }
  layer = document.createElement('div')
  layer.className = 'physics-layer'
  document.body.append(layer)
  return layer
}

/**
 * 物理坐标跟 CSS transform 共用同一套原点：物理层自己的边框盒。
 * 不要用 document + scrollY，body 的 overflow-x: hidden 会让那套坐标和绝对定位对不上。
 */
function layerBox(el: Element): LayerBox {
  const host = ensureLayer()
  const r = el.getBoundingClientRect()
  const o = host.getBoundingClientRect()
  const left = r.left - o.left
  const top = r.top - o.top
  return {
    left,
    top,
    w: r.width,
    h: r.height,
    cx: left + r.width / 2,
    cy: top + r.height / 2,
  }
}

/**
 * 贴纸的尺寸变量是父级选择器（.sticker-scatter > .sticker）给的，
 * 搬进物理层后那条规则不再命中，卡片会突然按默认上限变大。
 * 所以搬家前先把当前算出来的几个变量钉成内联值，尺寸原样带走。
 */
function freezeStickerSize(sticker: HTMLElement): void {
  const computed = getComputedStyle(sticker)
  for (const name of [
    '--sticker-room',
    '--sticker-max',
    '--sticker-fit',
    '--sticker-scale',
  ]) {
    const value = computed.getPropertyValue(name).trim()
    if (value) {
      sticker.style.setProperty(name, value)
    }
  }
}

/**
 * 页脚的字号 / 颜色 / 下划线都来自 .site-footer 这类祖先选择器，
 * 搬进物理层后那些规则不再命中，字会变大变黑、链接掉下划线。
 * 所以搬家前把算好的排版钉成内联值，飞起来的还是原来那身打扮。
 */
const FROZEN_TEXT_PROPS = [
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'font-variant',
  'line-height',
  'letter-spacing',
  'word-spacing',
  'color',
  'text-decoration-line',
  'text-decoration-style',
  'text-decoration-color',
  'text-decoration-thickness',
  'text-underline-offset',
  'text-transform',
]

function freezeTextStyle(target: HTMLElement, source: HTMLElement): void {
  const computed = getComputedStyle(source)
  for (const name of FROZEN_TEXT_PROPS) {
    const value = computed.getPropertyValue(name)
    if (value) {
      target.style.setProperty(name, value)
    }
  }
}

interface Extracted {
  box: LayerBox
  node: HTMLElement
}

/**
 * 让元素「飞起来」：复制一份进物理层，原件留在原地隐身占位。
 * 用 visibility 而不是换成占位方块，页脚的行高、基线与间距才分毫不动。
 */
function extractToLayer(el: HTMLElement): Extracted {
  const box = layerBox(el)
  const flying = el.cloneNode(true) as HTMLElement
  freezeTextStyle(flying, el)
  flying.classList.add('is-falling')

  el.style.visibility = 'hidden'
  ensureLayer().append(flying)
  return { box, node: flying }
}

function applyPose(actor: Actor): void {
  const { x, y } = actor.body.position
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(actor.body.angle)
  ) {
    return
  }
  actor.el.style.transform = `translate(${x - actor.w / 2}px, ${y - actor.h / 2}px) rotate(${actor.body.angle}rad)`
}

function boundFilter(): Matter.IChamferableBodyDefinition['collisionFilter'] {
  return {
    category: CAT_BOUND,
    mask: CAT_STICKER | CAT_FOOTER | CAT_BOUND,
    group: 0,
  }
}

function rebuildBounds(world: Matter.World): void {
  if (bounds.length > 0) {
    Composite.remove(world, bounds)
    bounds = []
  }

  const footer = document.querySelector('.site-footer')
  const footerBox = footer ? layerBox(footer) : null
  const inner = document.querySelector('.footer-inner')
  const innerBox = inner ? layerBox(inner) : null
  const width = Math.max(window.innerWidth, 320)
  // 地面正好贴着页脚下沿：落到底的卡片还留在页面里，不会掉出可视区
  const floorY = footerBox
    ? footerBox.top + footerBox.h
    : document.documentElement.scrollHeight
  const wallH = Math.max(floorY + 800, window.innerHeight * 4)
  const cx = width / 2
  const floor = Bodies.rectangle(cx, floorY + 24, width * 4, 48, {
    isStatic: true,
    label: 'bound',
    friction: 0.85,
    collisionFilter: boundFilter(),
  })
  // 墙远远甩在视口外：贴纸本来就会探出纸边，贴在 x=0 的墙上会卡在半空
  const left = Bodies.rectangle(-520, wallH / 2, 200, wallH, {
    isStatic: true,
    label: 'bound',
    collisionFilter: boundFilter(),
  })
  const right = Bodies.rectangle(width + 520, wallH / 2, 200, wallH, {
    isStatic: true,
    label: 'bound',
    collisionFilter: boundFilter(),
  })
  bounds = [floor, left, right]
  if (innerBox) {
    bounds.push(
      Bodies.rectangle(
        innerBox.cx,
        innerBox.top + innerBox.h + 10,
        Math.max(innerBox.w, 280) + 64,
        18,
        {
          isStatic: true,
          label: 'bound',
          friction: 0.7,
          collisionFilter: boundFilter(),
        }
      )
    )
  }
  Composite.add(world, bounds)
}

function unlockFooter(body: Matter.Body, sticker?: Matter.Body): void {
  if (body.label !== 'footer' || !body.isStatic) {
    return
  }
  Body.setStatic(body, false)
  if (!Number.isFinite(body.mass) || body.mass === 0) {
    Body.setDensity(body, 0.0014)
  }
  if (!Number.isFinite(body.inertia) || body.inertia === 0) {
    Body.setInertia(body, Math.max(24, body.mass * 60))
  }
  const kickX = sticker ? sticker.velocity.x * 0.45 : 0
  const kickY = sticker ? Math.max(0.6, sticker.velocity.y * 0.3) : 1
  Body.setVelocity(body, {
    x: kickX + (Math.random() - 0.5) * 2.4,
    y: kickY,
  })
  Body.setAngularVelocity(
    body,
    (sticker?.angularVelocity ?? 0) + (Math.random() - 0.5) * 0.28
  )
}

function queueUnlock(footer: Matter.Body, sticker: Matter.Body): void {
  if (footer.label === 'footer' && footer.isStatic) {
    unlockQueue.set(footer, sticker)
  }
}

function noteUserScroll(): void {
  if (programmaticScroll) {
    return
  }
  userScrollUntil = performance.now() + USER_SCROLL_COOLDOWN_MS
}

function bindUserScrollGuard(): void {
  if (document.documentElement.dataset.physicsScrollGuard) {
    return
  }
  document.documentElement.dataset.physicsScrollGuard = '1'
  const opts: AddEventListenerOptions = { passive: true, capture: true }
  window.addEventListener('wheel', noteUserScroll, opts)
  window.addEventListener('touchmove', noteUserScroll, opts)
}

function clampVelocities(): void {
  for (const actor of actors) {
    const { x, y } = actor.body.velocity
    const { x: px, y: py } = actor.body.position
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(px) ||
      !Number.isFinite(py)
    ) {
      Body.setVelocity(actor.body, { x: 0, y: 0 })
      Body.setAngularVelocity(actor.body, 0)
      continue
    }
    const speed = actor.body.speed
    if (speed > MAX_SPEED) {
      const scale = MAX_SPEED / speed
      Body.setVelocity(actor.body, { x: x * scale, y: y * scale })
    } else if (speed < REST_SPEED) {
      Body.setVelocity(actor.body, { x: 0, y: 0 })
      Body.setAngularVelocity(actor.body, 0)
    }
    // 小标点惯量太小，被撞一下能转出十几圈，收一下看着才像纸片
    const spin = actor.body.angularVelocity
    if (Math.abs(spin) > MAX_SPIN) {
      Body.setAngularVelocity(actor.body, Math.sign(spin) * MAX_SPIN)
    } else if (Math.abs(spin) < 0.02) {
      Body.setAngularVelocity(actor.body, 0)
    }
  }
}

function followStickers(): void {
  if (performance.now() < userScrollUntil) {
    return
  }

  const originTop = ensureLayer().getBoundingClientRect().top
  let target = 0
  let hasActiveFall = false
  for (const actor of actors) {
    if (
      actor.kind !== 'sticker' ||
      !actor.el.classList.contains('is-falling')
    ) {
      continue
    }
    if (actor.body.speed < FOLLOW_MIN_SPEED) {
      continue
    }
    hasActiveFall = true
    const viewY = originTop + actor.body.position.y
    if (viewY > target) {
      target = viewY
    }
  }
  if (!hasActiveFall || target <= window.innerHeight * 0.7) {
    return
  }
  programmaticScroll = true
  window.scrollBy(0, Math.min(36, target - window.innerHeight * 0.58))
  requestAnimationFrame(() => {
    programmaticScroll = false
  })
}

function ensureWorld(): Matter.Engine {
  if (engine) {
    return engine
  }

  document.documentElement.classList.add('physics-running')
  bindUserScrollGuard()

  const created = Engine.create({ enableSleeping: false })
  created.gravity.y = 1
  created.gravity.scale = 0.0012
  created.positionIterations = 8
  created.velocityIterations = 6
  engine = created

  const footerInner = document.querySelector<HTMLElement>('.footer-inner')
  if (footerInner && !footerInner.dataset.physicsReady) {
    walkFooter(footerInner)
    footerInner.dataset.physicsReady = '1'
    document.querySelector('.site-footer')?.classList.add('is-physics-shelf')

    footerInner
      .querySelectorAll<HTMLElement>('[data-physics-solid]')
      .forEach((el) => {
        const { box: pose, node } = extractToLayer(el)
        // 必须先当动态体创建再 setStatic：Matter 在 options 里直接写 isStatic
        // 时不会记下 _original，解锁会留下 Infinity 质量，下一步就是 NaN。
        const body = Bodies.rectangle(
          pose.cx,
          pose.cy,
          Math.max(8, pose.w),
          Math.max(10, pose.h),
          {
            label: 'footer',
            restitution: 0.08,
            friction: 0.32,
            frictionAir: 0.04,
            density: 0.0014,
            collisionFilter: {
              category: CAT_FOOTER,
              mask: CAT_STICKER | CAT_FOOTER | CAT_BOUND,
              group: 0,
            },
          }
        )
        Body.setStatic(body, true)
        actors.push({ body, el: node, w: pose.w, h: pose.h, kind: 'footer' })
        Composite.add(created.world, body)
        applyPose({ body, el: node, w: pose.w, h: pose.h, kind: 'footer' })
      })
  }

  rebuildBounds(created.world)

  Events.on(created, 'collisionStart', (event) => {
    for (const pair of event.pairs) {
      if (pair.bodyA.label === 'sticker') {
        queueUnlock(pair.bodyB, pair.bodyA)
      }
      if (pair.bodyB.label === 'sticker') {
        queueUnlock(pair.bodyA, pair.bodyB)
      }
    }
  })
  Events.on(created, 'collisionActive', (event) => {
    for (const pair of event.pairs) {
      if (pair.bodyA.label === 'sticker') {
        queueUnlock(pair.bodyB, pair.bodyA)
      }
      if (pair.bodyB.label === 'sticker') {
        queueUnlock(pair.bodyA, pair.bodyB)
      }
    }
  })

  Events.on(created, 'beforeUpdate', () => {
    for (const [body, sticker] of unlockQueue) {
      unlockFooter(body, sticker)
    }
    unlockQueue.clear()
    clampVelocities()
  })

  Events.on(created, 'afterUpdate', () => {
    for (const actor of actors) {
      applyPose(actor)
    }
    followStickers()
  })

  runner = Runner.create()
  Runner.run(runner, created)

  window.addEventListener('resize', () => {
    if (engine) {
      rebuildBounds(engine.world)
    }
  })

  return created
}

function dropNow(polaroid: HTMLElement): void {
  const sticker = polaroid.closest<HTMLElement>('.sticker') ?? polaroid
  if (!sticker.isConnected || sticker.classList.contains('is-falling')) {
    return
  }

  const world = ensureWorld()
  freezeStickerSize(sticker)
  const box = layerBox(polaroid)
  const w = Math.max(24, box.w)
  const h = Math.max(24, box.h)
  const angle = readAngleRad(polaroid)

  const host = ensureLayer()
  host.append(sticker)
  sticker.classList.add('is-falling')
  polaroid.classList.add('is-falling')
  polaroid.style.transform = 'none'
  polaroid.style.setProperty('--rotate', '0deg')
  polaroid.style.setProperty('--slump', '0deg')
  polaroid.style.setProperty('--slump-y', '0px')

  const body = Bodies.rectangle(box.cx, box.cy, w, h, {
    angle,
    restitution: 0.12,
    friction: 0.35,
    frictionAir: 0.012,
    density: 0.002,
    label: 'sticker',
    // 贴纸之间不互撞：散落排布本来就允许两张叠在一起，
    // 一旦让它们互相碰撞，Matter 会把重叠的卡片猛地弹开，直接飞出页面。
    collisionFilter: {
      category: CAT_STICKER,
      mask: CAT_FOOTER | CAT_BOUND,
      group: 0,
    },
  })
  // 只受重力：从静止开始垂直下落，不给横向初速度也不给自转，
  // 想歪只能靠撞到东西之后的碰撞响应。
  Body.setVelocity(body, { x: 0, y: 0 })
  Body.setAngularVelocity(body, 0)

  actors.push({ body, el: sticker, w, h, kind: 'sticker' })
  Composite.add(world.world, body)
  applyPose({ body, el: sticker, w, h, kind: 'sticker' })
}

/**
 * 撕胶带之后调用：相纸先垮着停一秒，再掉进物理世界。
 * 减少动态偏好时不掉，免得突然砸下来。
 */
export function scheduleDrop(polaroid: HTMLElement): void {
  if (prefersReducedMotion() || pending.has(polaroid)) {
    return
  }
  pending.add(polaroid)
  window.setTimeout(() => {
    dropNow(polaroid)
  }, FALL_DELAY_MS)
}
