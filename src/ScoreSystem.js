import {
  SCORE_PERFECT, SCORE_GOOD, COMBO_MULT_STEP,
  STAR_FILL_PER_PERFECT, STAR_DRAIN_PER_SEC, STAR_MULTIPLIER,
} from './config.js'

export class ScoreSystem {
  constructor() {
    this.reset()
  }

  reset() {
    this.score         = 0
    this.combo         = 0
    this.maxCombo      = 0
    this.misses        = 0
    this.totalNotes    = 0
    this.hitNotes      = 0
    this.starMeter     = 0       // 0..1
    this.starActive    = false
    this.hitStates     = new Array(5).fill(0)  // decay 0..1 for glow
    this._comboMilestone = 0
  }

  recordHit(judgment) {
    this.totalNotes++
    this.hitNotes++
    this.combo++
    if (this.combo > this.maxCombo) this.maxCombo = this.combo

    const mult = this._multiplier()
    const base = judgment === 'perfect' ? SCORE_PERFECT : SCORE_GOOD
    this.score += base * mult * (this.starActive ? STAR_MULTIPLIER : 1)

    if (judgment === 'perfect') {
      this.starMeter = Math.min(1, this.starMeter + STAR_FILL_PER_PERFECT)
    }

    // Return whether a combo milestone was just crossed
    const prevMilestone = this._comboMilestone
    this._comboMilestone = Math.floor(this.combo / COMBO_MULT_STEP)
    return this._comboMilestone > prevMilestone
  }

  recordMiss() {
    this.totalNotes++
    this.misses++
    this.combo = 0
    this._comboMilestone = 0
  }

  activateStarPower() {
    if (this.starMeter < 1 || this.starActive) return false
    this.starActive = true
    return true
  }

  // ── Called every frame with delta-time in seconds ─────────────────────────
  update(dt) {
    // Decay hit glow states
    for (let i = 0; i < this.hitStates.length; i++) {
      if (this.hitStates[i] > 0) {
        this.hitStates[i] = Math.max(0, this.hitStates[i] - dt * 8)
      }
    }

    // Drain star power
    if (this.starActive) {
      this.starMeter = Math.max(0, this.starMeter - STAR_DRAIN_PER_SEC * dt)
      if (this.starMeter <= 0) {
        this.starMeter  = 0
        this.starActive = false
      }
    }
  }

  flashLane(lane) {
    this.hitStates[lane] = 1
  }

  accuracy() {
    if (this.totalNotes === 0) return 100
    return Math.round((this.hitNotes / this.totalNotes) * 100)
  }

  grade() {
    const acc = this.accuracy()
    if (acc >= 95 && this.misses <= 3)  return 'S'
    if (acc >= 85)                       return 'A'
    if (acc >= 70)                       return 'B'
    if (acc >= 50)                       return 'C'
    return 'F'
  }

  _multiplier() {
    return Math.min(4, 1 + Math.floor(this.combo / COMBO_MULT_STEP))
  }

  getState() {
    return {
      score:      this.score,
      combo:      this.combo,
      maxCombo:   this.maxCombo,
      misses:     this.misses,
      multiplier: this._multiplier(),
      starMeter:  this.starMeter,
      starActive: this.starActive,
      hitStates:  this.hitStates,
      accuracy:   this.accuracy(),
    }
  }
}
