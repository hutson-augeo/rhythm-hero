import { LANE_KEYS } from './config.js'

export class InputManager {
  constructor() {
    this._hitCbs      = []
    this._activateCbs = []
    this._touchBtns   = []
    this._active      = false

    this._onKey   = this._onKey.bind(this)
    this._onTouch = this._onTouch.bind(this)
  }

  enable() {
    this._active = true
    window.addEventListener('keydown', this._onKey)
  }

  disable() {
    this._active = false
    window.removeEventListener('keydown', this._onKey)
  }

  onHit(cb)      { this._hitCbs.push(cb) }
  onActivate(cb) { this._activateCbs.push(cb) }

  // ── Register a touch button element for lane i ───────────────────────────
  registerTouchButton(el, lane) {
    const handler = (e) => {
      e.preventDefault()
      if (!this._active) return
      this._hitCbs.forEach(cb => cb(lane, performance.now()))
    }
    el.addEventListener('touchstart', handler, { passive: false })
    el.addEventListener('mousedown',  handler)
    this._touchBtns.push({ el, handler })
  }

  _onKey(e) {
    if (!this._active || e.repeat) return

    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault()
      this._activateCbs.forEach(cb => cb())
      return
    }

    const lane = LANE_KEYS.indexOf(e.key)
    if (lane !== -1) {
      this._hitCbs.forEach(cb => cb(lane, performance.now()))
    }
  }

  destroy() {
    this.disable()
    this._touchBtns.forEach(({ el, handler }) => {
      el.removeEventListener('touchstart', handler)
      el.removeEventListener('mousedown',  handler)
    })
    this._touchBtns = []
    this._hitCbs = []
    this._activateCbs = []
  }
}
