import { UI }   from './UI.js'
import { Game, STATE } from './Game.js'

const ui   = new UI()
const game = new Game(ui)

// ── Wire up highway canvas ────────────────────────────────────────────────────
const canvas   = document.getElementById('highway-canvas')
const crowd    = document.getElementById('crowd')
const touchBtns = [...document.querySelectorAll('.touch-btn')]

game.initHighway(canvas, crowd)
game.registerTouchButtons(touchBtns)

// ── Audio source buttons ──────────────────────────────────────────────────────
document.getElementById('btn-mic').addEventListener('click', async () => {
  ui.setAudioStatus('Connecting to microphone…', false)
  const res = await game.selectAudio('mic')
  if (res.ok) {
    ui.setAudioStatus('Microphone active', true)
  } else {
    ui.setAudioStatus(`Mic error: ${res.message}`, false)
  }
})

document.getElementById('btn-system').addEventListener('click', async () => {
  ui.setAudioStatus('Opening system audio picker…', false)
  const res = await game.selectAudio('system')
  if (res.ok) {
    ui.setAudioStatus('System audio active', true)
  } else {
    ui.setAudioStatus(`Error: ${res.message}`, false)
  }
})

// ── Play button ───────────────────────────────────────────────────────────────
document.getElementById('btn-play').addEventListener('click', () => {
  ui.showGame(ui.selectedLanes)
  game.start(ui.selectedDiff, ui.selectedLanes)
})

// ── Stop button (back to menu during play) ────────────────────────────────────
document.getElementById('btn-stop').addEventListener('click', () => {
  game.stop()
})

// ── Game over screen ──────────────────────────────────────────────────────────
document.getElementById('btn-retry').addEventListener('click', () => {
  game.returnToMenu()
  ui.showMenu()
  // Re-enable play since audio source is already set
  ui.playBtn.disabled = false
  ui.audioStatus.textContent = 'Audio source ready'
  ui.audioStatus.className = 'status ok'
})

document.getElementById('btn-menu').addEventListener('click', () => {
  game.returnToMenu()
  ui.showMenu()
})

// ── Initial state ─────────────────────────────────────────────────────────────
ui.showMenu()

// Select defaults
document.querySelector('[data-diff="medium"]').click()
document.querySelector('[data-lanes="5"]').click()
