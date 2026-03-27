// ─── Config ───────────────────────────────────────────────────────────────────
const LANE_COUNT    = 5;
const NOTE_SPEED    = 3;       // px per frame
const JUDGMENT_Y    = 60;      // px from bottom of lane
const PERFECT_WINDOW = 22;     // px either side of line = PERFECT
const GOOD_WINDOW   = 48;      // px either side of line = GOOD
const MISS_PAST     = 20;      // px past line before auto-miss
const BPM           = 120;
const BEAT_MS       = 60000 / BPM;

// Lane colors (hue shifted)
const LANE_COLORS = ['#ff4d6d', '#ffa94d', '#ffe066', '#69db7c', '#4dabf7'];

// Pitched tones per lane (MIDI-ish: C4 D4 E4 G4 A4)
const LANE_FREQS = [261.63, 293.66, 329.63, 392.00, 440.00];

// Simple repeating pattern (16 steps, bitmask per lane)
// 1 = note on that beat, 0 = rest
const PATTERNS = [
  [1,0,0,0, 1,0,0,0, 1,0,1,0, 0,0,1,0], // lane 1
  [0,0,1,0, 0,0,1,0, 0,0,0,1, 1,0,0,0], // lane 2
  [0,1,0,0, 0,1,0,1, 0,1,0,0, 0,1,0,0], // lane 3
  [0,0,0,1, 1,0,0,0, 0,0,1,0, 0,0,0,1], // lane 4
  [1,0,1,0, 0,0,0,0, 1,0,0,1, 0,1,0,0], // lane 5
];

// ─── State ────────────────────────────────────────────────────────────────────
let notes        = [];      // { lane, y, el, hit, missed }
let score        = 0;
let combo        = 0;
let maxCombo     = 0;
let misses       = 0;
let running      = false;
let beatIndex    = 0;
let lastBeatTime = 0;
let audioCtx     = null;
let rafId        = null;

// ─── DOM ──────────────────────────────────────────────────────────────────────
const laneEls      = [];
const scoreEl      = document.getElementById('score');
const comboEl      = document.getElementById('combo');
const missEl       = document.getElementById('misses');
const comboBanner  = document.getElementById('combo-display');
const overlay      = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg   = document.getElementById('overlay-msg');
const startBtn     = document.getElementById('start-btn');

// Build lane elements
const stage = document.getElementById('stage');
for (let i = 0; i < LANE_COUNT; i++) {
  const lane = document.createElement('div');
  lane.className = 'lane';
  lane.style.setProperty('--lane-color', LANE_COLORS[i]);

  const label = document.createElement('div');
  label.className = 'lane-label';
  label.textContent = i + 1;

  lane.appendChild(label);
  stage.appendChild(lane);
  laneEls.push(lane);
}

// ─── Audio ────────────────────────────────────────────────────────────────────
function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playTone(freq, type = 'triangle', duration = 0.12, gain = 0.4) {
  if (!audioCtx) return;
  const t   = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const env = audioCtx.createGain();

  osc.type      = type;
  osc.frequency.setValueAtTime(freq, t);

  env.gain.setValueAtTime(gain, t);
  env.gain.exponentialRampToValueAtTime(0.001, t + duration);

  osc.connect(env);
  env.connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + duration);
}

function playHit(lane, perfect) {
  const freq   = LANE_FREQS[lane];
  const gain   = perfect ? 0.5 : 0.3;
  const dur    = perfect ? 0.18 : 0.1;
  playTone(freq, 'triangle', dur, gain);
  if (perfect) playTone(freq * 2, 'sine', 0.1, 0.15); // harmonic shimmer
}

function playMiss() {
  playTone(80, 'sawtooth', 0.08, 0.15);
}

// ─── Note Spawning ────────────────────────────────────────────────────────────
function spawnNote(lane) {
  const el = document.createElement('div');
  el.className = 'note';
  laneEls[lane].appendChild(el);

  notes.push({ lane, y: -20, el, hit: false, missed: false });
}

// ─── Judgment ─────────────────────────────────────────────────────────────────
function laneHeight() {
  return laneEls[0].clientHeight;
}

function noteScreenY(note) {
  // y is distance from top of lane; judgment line is (laneHeight - JUDGMENT_Y) from top
  return note.y;
}

function distFromLine(note) {
  const lineY = laneHeight() - JUDGMENT_Y;
  return note.y - lineY; // positive = past line, negative = above line
}

function tryHit(lane) {
  // Find closest unhit note in this lane within good window
  let best     = null;
  let bestDist = Infinity;

  for (const note of notes) {
    if (note.lane !== lane || note.hit || note.missed) continue;
    const dist = Math.abs(distFromLine(note));
    if (dist < GOOD_WINDOW && dist < bestDist) {
      best     = note;
      bestDist = dist;
    }
  }

  if (!best) {
    // Early / ghost press — mild penalty
    flashLane(lane, false);
    return;
  }

  const perfect = bestDist <= PERFECT_WINDOW;
  best.hit = true;
  best.el.classList.add('hit');
  best.el.addEventListener('animationend', () => best.el.remove(), { once: true });

  const pts = perfect ? 300 : 100;
  score += pts * Math.max(1, Math.floor(combo / 10));
  combo++;
  if (combo > maxCombo) maxCombo = combo;

  updateHUD();
  flashLane(lane, true);
  showJudgment(lane, perfect ? 'PERFECT' : 'GOOD', perfect ? '#ffe066' : '#69db7c');
  playHit(lane, perfect);

  if (combo > 0 && combo % 10 === 0) showComboBanner();
}

function flashLane(lane, good) {
  laneEls[lane].classList.add('active');
  const flash = document.createElement('div');
  flash.className = 'hit-flash';
  flash.style.background = good ? LANE_COLORS[lane] : '#fff';
  laneEls[lane].appendChild(flash);
  flash.addEventListener('animationend', () => flash.remove(), { once: true });
  setTimeout(() => laneEls[lane].classList.remove('active'), 100);
}

function showJudgment(lane, text, color) {
  const el = document.createElement('div');
  el.className = 'judgment-text';
  el.textContent = text;
  el.style.color = color;
  laneEls[lane].appendChild(el);
  el.addEventListener('animationend', () => el.remove(), { once: true });
}

function showComboBanner() {
  comboBanner.textContent = `${combo} COMBO!`;
  comboBanner.classList.add('show');
  clearTimeout(comboBanner._timer);
  comboBanner._timer = setTimeout(() => comboBanner.classList.remove('show'), 800);
}

// ─── HUD ──────────────────────────────────────────────────────────────────────
function updateHUD() {
  scoreEl.textContent = score;
  comboEl.textContent = combo;
  missEl.textContent  = misses;
}

// ─── Game Loop ────────────────────────────────────────────────────────────────
function gameLoop(ts) {
  if (!running) return;

  // Schedule beats
  if (ts - lastBeatTime >= BEAT_MS / 2) { // 8th-note resolution
    const step = beatIndex % 16;
    for (let lane = 0; lane < LANE_COUNT; lane++) {
      if (PATTERNS[lane][step]) spawnNote(lane);
    }
    beatIndex++;
    lastBeatTime = ts;
  }

  const lineY = laneHeight() - JUDGMENT_Y;

  for (const note of notes) {
    if (note.hit || note.missed) continue;

    note.y += NOTE_SPEED;
    note.el.style.transform = `translateY(${note.y}px)`;

    // Auto-miss: note scrolled past line + buffer
    if (distFromLine(note) > MISS_PAST) {
      note.missed = true;
      note.el.classList.add('missed');
      setTimeout(() => note.el.remove(), 300);
      misses++;
      combo = 0;
      playMiss();
      showJudgment(note.lane, 'MISS', '#ff4d6d');
      updateHUD();
    }
  }

  // Prune old notes
  notes = notes.filter(n => !(n.hit || n.missed) || n.el.isConnected);

  rafId = requestAnimationFrame(gameLoop);
}

// ─── Input ────────────────────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (!running) return;
  const lane = parseInt(e.key) - 1;
  if (lane >= 0 && lane < LANE_COUNT && !e.repeat) tryHit(lane);
});

// ─── Start / Restart ──────────────────────────────────────────────────────────
function startGame() {
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();

  // Reset state
  notes      = [];
  score      = 0;
  combo      = 0;
  maxCombo   = 0;
  misses     = 0;
  beatIndex  = 0;
  lastBeatTime = 0;

  // Clear leftover note elements
  laneEls.forEach(l => {
    l.querySelectorAll('.note, .hit-flash, .judgment-text').forEach(el => el.remove());
  });

  updateHUD();
  overlay.style.display = 'none';
  running = true;

  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(gameLoop);
}

startBtn.addEventListener('click', startGame);
