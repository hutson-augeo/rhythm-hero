import { DIFFICULTIES, LANE_COLORS } from './config.js'

export class UI {
  constructor() {
    // Screens
    this.menuScreen  = document.getElementById('menu')
    this.gameScreen  = document.getElementById('game')
    this.overScreen  = document.getElementById('game-over')

    // Menu controls
    this.diffBtns    = document.querySelectorAll('[data-diff]')
    this.laneBtns    = document.querySelectorAll('[data-lanes]')
    this.audioMicBtn = document.getElementById('btn-mic')
    this.audioSysBtn = document.getElementById('btn-system')
    this.playBtn     = document.getElementById('btn-play')
    this.audioStatus = document.getElementById('audio-status')

    // HUD
    this.hudScore    = document.getElementById('hud-score')
    this.hudCombo    = document.getElementById('hud-combo')
    this.hudMult     = document.getElementById('hud-mult')
    this.hudMisses   = document.getElementById('hud-misses')
    this.starBar     = document.getElementById('star-bar')
    this.starFill    = document.getElementById('star-fill')
    this.comboBanner = document.getElementById('combo-banner')
    this.starBanner  = document.getElementById('star-banner')
    this.laneLabels  = document.getElementById('lane-labels')

    // Game over
    this.overGrade   = document.getElementById('over-grade')
    this.overScore   = document.getElementById('over-score')
    this.overCombo   = document.getElementById('over-combo')
    this.overAcc     = document.getElementById('over-acc')
    this.overMisses  = document.getElementById('over-misses')
    this.retryBtn    = document.getElementById('btn-retry')
    this.menuBtn     = document.getElementById('btn-menu')

    // Touch buttons
    this.touchBtns   = document.querySelectorAll('.touch-btn')

    // State
    this.selectedDiff  = 'medium'
    this.selectedLanes = 5
    this._judgmentTimers = {}
    this._bannerTimer    = null

    this._bindMenuControls()
  }

  // ── Menu ──────────────────────────────────────────────────────────────────

  _bindMenuControls() {
    this.diffBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.diffBtns.forEach(b => b.classList.remove('selected'))
        btn.classList.add('selected')
        this.selectedDiff = btn.dataset.diff
        this._updateLaneMax()
      })
    })

    this.laneBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.laneBtns.forEach(b => b.classList.remove('selected'))
        btn.classList.add('selected')
        this.selectedLanes = parseInt(btn.dataset.lanes)
        this._updateTouchButtons()
      })
    })
  }

  _updateLaneMax() {
    const max = DIFFICULTIES[this.selectedDiff].maxLanes
    this.laneBtns.forEach(btn => {
      const n = parseInt(btn.dataset.lanes)
      btn.disabled = n > max
      if (n > max && parseInt(btn.dataset.lanes) === this.selectedLanes) {
        // Deselect if now over max
        this.laneBtns.forEach(b => {
          if (parseInt(b.dataset.lanes) === max) b.click()
        })
      }
    })
  }

  _updateTouchButtons() {
    this.touchBtns.forEach((btn, i) => {
      btn.style.display = i < this.selectedLanes ? '' : 'none'
    })
  }

  setAudioStatus(text, ok) {
    this.audioStatus.textContent = text
    this.audioStatus.className   = ok ? 'status ok' : 'status err'
    if (ok) this.playBtn.disabled = false
  }

  showMenu() {
    this.menuScreen.classList.remove('hidden')
    this.gameScreen.classList.add('hidden')
    this.overScreen.classList.add('hidden')
    this.playBtn.disabled = true
    this.audioStatus.textContent = 'No audio source selected'
    this.audioStatus.className = 'status'
  }

  showGame(numLanes) {
    this.menuScreen.classList.add('hidden')
    this.overScreen.classList.add('hidden')
    this.gameScreen.classList.remove('hidden')

    this.laneLabels.innerHTML = ''
    this._updateTouchButtons()
  }

  // ── HUD ───────────────────────────────────────────────────────────────────

  updateHUD(state) {
    this.hudScore.textContent  = state.score.toLocaleString()
    this.hudCombo.textContent  = state.combo
    this.hudMult.textContent   = `×${state.multiplier}`
    this.hudMisses.textContent = state.misses
    this.starFill.style.width  = `${state.starMeter * 100}%`

    if (state.starActive) {
      this.starBar.classList.add('active')
    } else {
      this.starBar.classList.remove('active')
    }
  }

  showJudgmentText(lane, text, color) {
    // judgment text removed
  }

  showComboBanner(combo, mult) {
    this.comboBanner.innerHTML =
      `<span class="cb-combo">${combo} COMBO</span><span class="cb-mult">×${mult}</span>`
    this.comboBanner.classList.remove('show')
    void this.comboBanner.offsetWidth
    this.comboBanner.classList.add('show')

    clearTimeout(this._bannerTimer)
    this._bannerTimer = setTimeout(() => this.comboBanner.classList.remove('show'), 1100)
  }

  showStarPowerBanner() {
    this.starBanner.classList.remove('show')
    void this.starBanner.offsetWidth
    this.starBanner.classList.add('show')
    setTimeout(() => this.starBanner.classList.remove('show'), 1500)
  }

  hideStar() {
    this.starBanner.classList.remove('show')
  }

  // ── Game Over ─────────────────────────────────────────────────────────────

  showGameOver(stats) {
    this.menuScreen.classList.add('hidden')
    this.gameScreen.classList.add('hidden')
    this.overScreen.classList.remove('hidden')

    const gradeColors = { S: '#ffe040', A: '#69db7c', B: '#4dabf7', C: '#ffa94d', F: '#ff4d6d' }
    this.overGrade.textContent  = stats.grade
    this.overGrade.style.color  = gradeColors[stats.grade] || '#fff'
    this.overScore.textContent  = stats.score.toLocaleString()
    this.overCombo.textContent  = stats.maxCombo
    this.overAcc.textContent    = `${stats.accuracy}%`
    this.overMisses.textContent = stats.misses
  }
}
