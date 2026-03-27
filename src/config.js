// ─── Difficulty Presets ────────────────────────────────────────────────────
export const DIFFICULTIES = {
  easy: {
    label: 'EASY',
    color: '#69db7c',
    travelTime: 1800,   // ms notes take to reach hit zone
    perfectMs: 80,      // ±ms for PERFECT
    goodMs: 160,        // ±ms for GOOD
    sensitivity: 1.55,  // beat detection threshold multiplier (higher = fewer notes)
    maxLanes: 3,
  },
  medium: {
    label: 'MEDIUM',
    color: '#ffe066',
    travelTime: 1300,
    perfectMs: 60,
    goodMs: 120,
    sensitivity: 1.35,
    maxLanes: 4,
  },
  hard: {
    label: 'HARD',
    color: '#ffa94d',
    travelTime: 950,
    perfectMs: 45,
    goodMs: 90,
    sensitivity: 1.18,
    maxLanes: 5,
  },
  god: {
    label: 'GOD',
    color: '#ff4d6d',
    travelTime: 620,
    perfectMs: 28,
    goodMs: 58,
    sensitivity: 1.06,
    maxLanes: 5,
  },
}

// Guitar Hero lane order: Green, Red, Yellow, Blue, Orange
export const LANE_COLORS  = ['#3be068', '#ff3355', '#ffe040', '#33aaff', '#ff9900']
export const LANE_DARK    = ['#0d3318', '#330d14', '#332d00', '#001833', '#331e00']
export const LANE_LABELS  = ['1', '2', '3', '4', '5']

// Keyboard keys 1-5
export const LANE_KEYS = ['1', '2', '3', '4', '5']

// ─── Scoring ───────────────────────────────────────────────────────────────
export const SCORE_PERFECT      = 300
export const SCORE_GOOD         = 100
export const COMBO_MULT_STEP    = 10  // every N combo, +1x multiplier (capped at 4x)

// ─── Star Power ────────────────────────────────────────────────────────────
export const STAR_FILL_PER_PERFECT = 0.055   // 18 perfect hits fills it
export const STAR_DRAIN_PER_SEC    = 0.14    // empties in ~7s when active
export const STAR_MULTIPLIER       = 2

// ─── Beat Detection Frequency Bands ────────────────────────────────────────
// 2048-point FFT at 44100 Hz → ~21.5 Hz/bin
// Bands map to lanes 0..4
export const FREQ_BANDS = [
  [1,   6  ],  // 21–130 Hz   sub-bass / kick
  [6,   16 ],  // 130–344 Hz  bass
  [16,  40 ],  // 344–860 Hz  low-mid
  [40,  100],  // 860–2150 Hz mid
  [100, 210],  // 2150–4500 Hz high-mid / hi-hat
]

// Minimum ms between notes on the same lane (prevents double-fire)
export const MIN_NOTE_GAP = 280
