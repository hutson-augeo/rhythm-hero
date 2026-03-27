import { DIFFICULTIES, LANE_COLORS } from './config.js'
import { AudioEngine }  from './AudioEngine.js'
import { Highway }      from './Highway.js'
import { NoteManager }  from './NoteManager.js'
import { InputManager } from './InputManager.js'
import { ScoreSystem }  from './ScoreSystem.js'
import { CrowdEngine }  from './CrowdEngine.js'

// ── States ────────────────────────────────────────────────────────────────────
export const STATE = { MENU: 'menu', PLAYING: 'playing', PAUSED: 'paused', OVER: 'over' }

export class Game {
  constructor(ui) {
    this.ui       = ui
    this.state    = STATE.MENU
    this.audio    = new AudioEngine()
    this.notes    = new NoteManager()
    this.input    = new InputManager()
    this.score    = new ScoreSystem()
    this.highway  = null  // created after canvas is in DOM
    this.crowd    = null
    this.config   = null
    this.numLanes = 5
    this._raf     = null
    this._lastTs  = 0
  }

  // ── Setup ──────────────────────────────────────────────────────────────────

  initHighway(canvas, crowdContainer) {
    this.highway = new Highway(canvas)
    this.crowd   = new CrowdEngine(this.audio, crowdContainer)
  }

  registerTouchButtons(buttons) {
    buttons.forEach((btn, i) => this.input.registerTouchButton(btn, i))
  }

  // ── Audio source selection ─────────────────────────────────────────────────

  async selectAudio(type) {
    try {
      await this.audio.selectSource(type)
      return { ok: true }
    } catch (err) {
      return { ok: false, message: err.message }
    }
  }

  // ── Start ──────────────────────────────────────────────────────────────────

  start(diffKey, numLanes) {
    this.config   = DIFFICULTIES[diffKey]
    this.numLanes = Math.min(numLanes, this.config.maxLanes)

    this.notes.configure(this.config, this.numLanes)
    this.notes.reset()
    this.score.reset()
    this.crowd.reset()

    // Clear any stale callbacks from previous runs, then register fresh ones
    this.input.clearCallbacks()
    this.input.enable()
    this.input.onHit((lane, ts) => this._handleHit(lane, ts))
    this.input.onActivate(() => this._activateStarPower())

    this.state = STATE.PLAYING

    // Delay one rAF so the browser lays out the now-visible canvas before we resize + start
    cancelAnimationFrame(this._raf)
    requestAnimationFrame(() => {
      this.highway.resize()
      this._lastTs = performance.now()
      this._raf = requestAnimationFrame(ts => this._loop(ts))
    })
  }

  // ── Main Loop ──────────────────────────────────────────────────────────────

  _loop(ts) {
    if (this.state !== STATE.PLAYING) return

    try {
      const dt = Math.min((ts - this._lastTs) / 1000, 0.05)
      this._lastTs = ts

      const beats = this.audio.getBeats(ts, this.config.sensitivity, this.numLanes)
      this.notes.spawnFromBeats(beats, ts)

      const missed = this.notes.update(ts)
      missed.forEach(() => {
        this.score.recordMiss()
        this.audio.playMiss()
      })

      this.score.update(dt)

      const s = this.score.getState()
      this.crowd.update(s, dt)
      this.highway.render(this.notes.notes, this.numLanes, s, ts)
      this.ui.updateHUD(s)
    } catch (err) {
      console.error('Game loop error:', err)
    }

    this._raf = requestAnimationFrame(ts2 => this._loop(ts2))
  }

  // ── Input handling ─────────────────────────────────────────────────────────

  _handleHit(lane, ts) {
    if (this.state !== STATE.PLAYING) return
    if (lane >= this.numLanes) return

    const result = this.notes.tryHit(lane, ts)
    this.score.flashLane(lane)

    if (!result) {
      // Ghost / too early — subtle lane flash but no miss penalty
      this.ui.showJudgmentText(lane, '', '#ffffff')
      return
    }

    const { judgment, note } = result
    const milestoneHit = this.score.recordHit(judgment)
    const state = this.score.getState()

    this.audio.playHit(lane, judgment === 'perfect')
    this.highway.spawnParticles(lane, this.numLanes, judgment === 'perfect', ts)

    const text  = judgment === 'perfect' ? 'PERFECT' : 'GOOD'
    const color = judgment === 'perfect' ? '#ffe040' : '#69db7c'
    this.ui.showJudgmentText(lane, text, color)

    if (milestoneHit) {
      this.ui.showComboBanner(state.combo, state.multiplier)
      this.crowd.cheer(Math.min(0.3 + state.combo * 0.02, 1))
    }

    if (state.starActive && state.starMeter <= 0) {
      this.ui.hideStar()
    }
  }

  _activateStarPower() {
    if (this.state !== STATE.PLAYING) return
    const activated = this.score.activateStarPower()
    if (activated) {
      this.audio.playStarPowerSwoosh()
      this.ui.showStarPowerBanner()
      this.crowd.cheer(1.0)
    }
  }

  _showJudgment(lane, text) {
    if (lane !== null) this.ui.showJudgmentText(lane, text, '#ff4d6d')
  }

  // ── Stop / Game Over ───────────────────────────────────────────────────────

  stop() {
    this.state = STATE.OVER
    cancelAnimationFrame(this._raf)
    this.input.disable()

    const s = this.score.getState()
    this.ui.showGameOver({
      score:    s.score,
      maxCombo: s.maxCombo,
      accuracy: s.accuracy,
      misses:   s.misses,
      grade:    this.score.grade(),
    })
  }

  returnToMenu() {
    this.state = STATE.MENU
    cancelAnimationFrame(this._raf)
    this.input.disable()
    this.notes.reset()
    this.score.reset()
  }

  destroy() {
    cancelAnimationFrame(this._raf)
    this.input.destroy()
    this.audio.destroy()
    if (this.highway) this.highway.destroy()
  }
}
