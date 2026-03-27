import { LANE_COLORS, LANE_LABELS } from './config.js'

export class Highway {
  constructor(canvas) {
    this.canvas    = canvas
    this.ctx       = canvas.getContext('2d')
    this.particles = []
    this._resize()
    this._ro = new ResizeObserver(() => this._resize())
    this._ro.observe(canvas)
  }

  _resize() {
    const dpr = window.devicePixelRatio || 1
    const w   = this.canvas.offsetWidth
    const h   = this.canvas.offsetHeight
    this.canvas.width  = w * dpr
    this.canvas.height = h * dpr
    this.ctx.scale(dpr, dpr)
    this.W = w
    this.H = h

    // Perspective geometry
    this.vpX    = w * 0.5
    this.vpY    = h * 0.06
    this.hitY   = h * 0.82
    this.margin = Math.max(w * 0.04, 10)
    this.hW     = w - 2 * this.margin   // highway total width at hit zone
  }

  // ─ Helpers ────────────────────────────────────────────────────────────────

  // x center of lane `lane` at progress t (0=far, 1=near)
  _lx(lane, t, n) {
    const lw  = this.hW / n
    const bx  = this.margin + (lane + 0.5) * lw
    return this.vpX + (bx - this.vpX) * t
  }

  // y at progress t
  _ly(t) {
    return this.vpY + (this.hitY - this.vpY) * t
  }

  // lane width at progress t
  _lw(t, n) {
    return (this.hW / n) * t
  }

  _roundRect(x, y, w, h, r) {
    const { ctx } = this
    r = Math.min(r, w / 2, h / 2)
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.arcTo(x + w, y, x + w, y + r, r)
    ctx.lineTo(x + w, y + h - r)
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
    ctx.lineTo(x + r, y + h)
    ctx.arcTo(x, y + h, x, y + h - r, r)
    ctx.lineTo(x, y + r)
    ctx.arcTo(x, y, x + r, y, r)
    ctx.closePath()
  }

  // ─ Main render ────────────────────────────────────────────────────────────

  render(notes, numLanes, state, nowMs) {
    const { ctx, W, H } = this
    ctx.clearRect(0, 0, W, H)

    this._drawBg(state.starActive)
    this._drawHighway(numLanes, state.starActive, nowMs)
    this._drawNotes(notes, numLanes)
    this._drawHitZone(numLanes, state.hitStates, state.starActive)
    this._drawParticles(nowMs)
  }

  // ─ Background ─────────────────────────────────────────────────────────────

  _drawBg(star) {
    const { ctx, W, H, vpX, vpY } = this
    const bg = ctx.createRadialGradient(vpX, vpY, 0, vpX, H * 0.5, H)

    if (star) {
      bg.addColorStop(0, '#1a0a30')
      bg.addColorStop(1, '#05020f')
    } else {
      bg.addColorStop(0, '#0d0d1a')
      bg.addColorStop(1, '#050508')
    }
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
  }

  // ─ Highway surface + lane lines ───────────────────────────────────────────

  _drawHighway(n, star, nowMs) {
    const { ctx, vpX, vpY, hitY, margin, hW } = this
    const leftBot  = margin
    const rightBot = margin + hW

    // Surface trapezoid
    const surf = ctx.createLinearGradient(0, vpY, 0, hitY)
    if (star) {
      surf.addColorStop(0, 'rgba(200,160,255,0.04)')
      surf.addColorStop(1, 'rgba(200,160,255,0.10)')
    } else {
      surf.addColorStop(0, 'rgba(15,15,35,0.7)')
      surf.addColorStop(1, 'rgba(25,25,55,0.85)')
    }
    ctx.beginPath()
    ctx.moveTo(vpX, vpY)
    ctx.lineTo(leftBot,  hitY)
    ctx.lineTo(rightBot, hitY)
    ctx.closePath()
    ctx.fillStyle = surf
    ctx.fill()

    // Lane dividers
    ctx.save()
    for (let i = 0; i <= n; i++) {
      const bx = margin + (i / n) * hW
      ctx.beginPath()
      ctx.moveTo(vpX, vpY)
      ctx.lineTo(bx, hitY)
      ctx.strokeStyle = star ? 'rgba(220,180,255,0.35)' : 'rgba(70,70,120,0.55)'
      ctx.lineWidth = 1
      ctx.stroke()
    }
    ctx.restore()

    // Scrolling horizontal grid bars
    const barCount = 8
    const scroll   = (nowMs / 1600) % 1  // 0..1, loops
    for (let b = 0; b < barCount; b++) {
      const t = ((b / barCount) + scroll) % 1
      if (t < 0.05) continue
      const y    = this._ly(t)
      const xleft  = vpX + (leftBot  - vpX) * t
      const xright = vpX + (rightBot - vpX) * t

      ctx.beginPath()
      ctx.moveTo(xleft, y)
      ctx.lineTo(xright, y)
      ctx.strokeStyle = star
        ? `rgba(200,160,255,${0.08 + t * 0.12})`
        : `rgba(60,60,110,${0.1 + t * 0.15})`
      ctx.lineWidth = t * 1.5
      ctx.stroke()
    }

    // Subtle edge glow strips
    for (let i = 0; i < n; i++) {
      const color = LANE_COLORS[i]
      const bx1 = margin + (i / n) * hW
      const bx2 = margin + ((i + 1) / n) * hW
      const bcx = (bx1 + bx2) / 2

      const lg = ctx.createLinearGradient(0, vpY, 0, hitY)
      lg.addColorStop(0, color + '00')
      lg.addColorStop(1, color + '18')

      ctx.beginPath()
      ctx.moveTo(vpX, vpY)
      ctx.lineTo(bx1, hitY)
      ctx.lineTo(bx2, hitY)
      ctx.closePath()
      ctx.fillStyle = lg
      ctx.fill()
    }
  }

  // ─ Notes ──────────────────────────────────────────────────────────────────

  _drawNotes(notes, n) {
    const { ctx } = this

    for (const note of notes) {
      if (note.hit || note.missed) continue
      const t = note.progress
      if (t < 0.02 || t > 1.12) continue

      const tc  = Math.min(t, 1)
      const cx  = this._lx(note.lane, tc, n)
      const cy  = this._ly(tc)
      const lw  = this._lw(tc, n)
      const nW  = Math.max(8, lw * 0.84)
      const nH  = Math.max(5, lw * 0.24)
      const col = LANE_COLORS[note.lane]

      ctx.save()
      ctx.shadowColor = col
      ctx.shadowBlur  = 10 + tc * 10

      // Note body
      this._roundRect(cx - nW / 2, cy - nH / 2, nW, nH, 5)
      ctx.fillStyle = col
      ctx.fill()

      // White highlight stripe (top third)
      const hl = ctx.createLinearGradient(0, cy - nH / 2, 0, cy)
      hl.addColorStop(0, 'rgba(255,255,255,0.55)')
      hl.addColorStop(1, 'rgba(255,255,255,0)')
      this._roundRect(cx - nW / 2, cy - nH / 2, nW, nH * 0.5, 5)
      ctx.fillStyle = hl
      ctx.fill()

      ctx.restore()
    }
  }

  // ─ Hit zone ───────────────────────────────────────────────────────────────

  _drawHitZone(n, hitStates, star) {
    const { ctx, W, H, hitY, margin, hW } = this

    // Dark floor
    ctx.fillStyle = 'rgba(0,0,0,0.88)'
    ctx.fillRect(0, hitY + 2, W, H - hitY)

    // Separator line
    ctx.beginPath()
    ctx.moveTo(0, hitY + 2)
    ctx.lineTo(W, hitY + 2)
    ctx.strokeStyle = 'rgba(80,80,130,0.6)'
    ctx.lineWidth = 1
    ctx.stroke()

    const lw = hW / n
    for (let i = 0; i < n; i++) {
      const cx    = this._lx(i, 1, n)
      const cy    = hitY
      const r     = lw * 0.36
      const col   = LANE_COLORS[i]
      const glow  = hitStates[i] || 0
      const active = glow > 0.05

      ctx.save()

      if (active) {
        ctx.shadowColor = col
        ctx.shadowBlur  = 30 + glow * 20
      }

      // Outer ring
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.strokeStyle = active
        ? col
        : (star ? 'rgba(200,160,255,0.5)' : 'rgba(100,100,160,0.5)')
      ctx.lineWidth = active ? 3 : 1.5
      ctx.stroke()

      // Inner fill
      ctx.beginPath()
      ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2)
      if (active) {
        const rg = ctx.createRadialGradient(cx, cy - r * 0.3, 0, cx, cy, r * 0.82)
        rg.addColorStop(0, col + 'ff')
        rg.addColorStop(1, col + 'aa')
        ctx.fillStyle = rg
      } else {
        ctx.fillStyle = col + '22'
      }
      ctx.fill()

      // Key label
      ctx.fillStyle = active ? '#000' : col
      ctx.font = `bold ${Math.max(11, Math.round(r * 0.65))}px monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(LANE_LABELS[i], cx, cy + 1)

      ctx.restore()
    }
  }

  // ─ Particles ──────────────────────────────────────────────────────────────

  _drawParticles(nowMs) {
    const { ctx } = this
    this.particles = this.particles.filter(p => {
      const age = (nowMs - p.born) / 1000
      if (age >= p.life) return false

      p.x  += p.vx
      p.y  += p.vy
      p.vy += 0.25 // gravity

      const alpha = (1 - age / p.life) * p.a
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r * (1 - age / p.life * 0.5), 0, Math.PI * 2)
      ctx.fillStyle = p.color
      ctx.fill()
      ctx.restore()
      return true
    })
  }

  spawnParticles(lane, numLanes, perfect, nowMs) {
    const cx    = this._lx(lane, 1, numLanes)
    const cy    = this.hitY
    const color = LANE_COLORS[lane]
    const count = perfect ? 20 : 10

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i / count) + Math.random() * 0.4
      const spd   = (2 + Math.random() * 5) * (perfect ? 1.6 : 1)
      this.particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - (perfect ? 5 : 3),
        r: 2 + Math.random() * (perfect ? 5 : 3),
        color,
        a: 0.9,
        life: 0.35 + Math.random() * 0.25,
        born: nowMs,
      })
    }

    // Star-shaped burst for perfect
    if (perfect) {
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i / 6)
        this.particles.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * 8,
          vy: Math.sin(angle) * 8 - 4,
          r: 4 + Math.random() * 3,
          color: '#ffffff',
          a: 0.7,
          life: 0.5,
          born: nowMs,
        })
      }
    }
  }

  destroy() {
    this._ro.disconnect()
  }
}
