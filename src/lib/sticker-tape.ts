/**
 * 点一下胶带就撕下来。
 *
 * 胶带飘走之后相纸会顺势垮一点，像真的失去了支撑。
 * 撕掉的状态不做持久化：刷新一次全都贴回去，还能再撕一遍。
 */

import { scheduleDrop } from './sticker-physics.ts'

const PEEL_MS = 500

let didInit = false

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** 撕完之后让相纸垮下去；下一帧再写值，过渡才会真的跑起来。 */
function slump(polaroid: HTMLElement): void {
  polaroid.classList.add('is-untaped')
  requestAnimationFrame(() => {
    const dir = Math.random() < 0.5 ? -1 : 1
    polaroid.style.setProperty('--slump', `${(dir * (1 + Math.random() * 2)).toFixed(2)}deg`)
    polaroid.style.setProperty('--slump-y', `${(2 + Math.random() * 3).toFixed(1)}px`)
  })
}

function peel(tape: HTMLElement): void {
  if (tape.dataset.peeled === '1') {
    return
  }
  tape.dataset.peeled = '1'

  const polaroid = tape.closest<HTMLElement>('.polaroid')

  // 先摘出 Tab 顺序，撕的过程中焦点不该还停在一张要消失的胶带上
  tape.setAttribute('tabindex', '-1')
  if (document.activeElement === tape) {
    tape.blur()
  }

  if (prefersReducedMotion()) {
    tape.remove()
    if (polaroid) {
      slump(polaroid)
    }
    return
  }

  tape.classList.add('is-peeling')
  let done = false
  const finish = () => {
    if (done) {
      return
    }
    done = true
    tape.remove()
  }
  tape.addEventListener('animationend', finish, { once: true })
  // 动画事件偶尔不触发（标签页切到后台等），兜一个定时器
  window.setTimeout(finish, PEEL_MS + 120)

  if (polaroid) {
    slump(polaroid)
    scheduleDrop(polaroid)
  }
}

/**
 * 用事件委托监听整个文档，贴画由脚本重排后也不用重新绑定。
 */
export function initTapePeel(): void {
  if (didInit) {
    return
  }
  didInit = true

  document.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof Element)) {
      return
    }
    const tape = target.closest<HTMLElement>('button.tape')
    if (!tape) {
      return
    }
    event.preventDefault()
    peel(tape)
  })
}
