# Rhythm Hero — CLAUDE.md

## Project Overview
Guitar Hero-style browser rhythm game. Works on desktop, mobile, and tablet.
Audio source is whatever is playing on the device (system audio or microphone) — the game does real-time beat detection and generates notes from it.

## Running
```bash
npm run dev     # starts at http://localhost:3000
# or
npx serve . --listen 3000
```
> Must be served (not opened as file://) — ES modules require HTTP.

## Architecture

```
rhythm-hero/
├── index.html              # Shell — all screens declared here
├── package.json
├── CLAUDE.md
├── src/
│   ├── main.js             # Entry point — wires all systems, handles button events
│   ├── config.js           # All constants: difficulties, lane colors, scoring, freq bands
│   ├── AudioEngine.js      # MediaStream capture, AnalyserNode, beat detection, sound synthesis
│   ├── Highway.js          # Canvas renderer — perspective highway, notes, particles, hit zone
│   ├── NoteManager.js      # Note lifecycle: spawn, update progress, tryHit, auto-miss
│   ├── InputManager.js     # Keyboard (1–5, Space) + touch button event routing
│   ├── ScoreSystem.js      # Score, combo, multiplier, star power meter
│   ├── CrowdEngine.js      # Crowd audio synthesis + CSS crowd animation energy
│   ├── Game.js             # Orchestrator — state machine, game loop (RAF)
│   └── UI.js               # DOM manipulation: menus, HUD updates, banners, game-over
└── styles/
    └── main.css            # All styles — menu, HUD, highway, crowd, overlays, touch buttons
```

## Core Systems

### Audio Capture (`AudioEngine.js`)
- Desktop Chrome: `getDisplayMedia({ audio:true, video:true })` captures system/tab audio
- Fallback: `getUserMedia({ audio:true })` for microphone
- Audio stream → `AnalyserNode` (FFT size 2048) → NOT connected to output (no feedback)

### Beat Detection (`AudioEngine.getBeats()`)
- Divides FFT into 5 frequency bands (sub-bass → hi-hat), one per lane
- Per-band rolling energy history (35 frames)
- Beat fires when: `energy > avg * sensitivity AND energy > 18 AND gap > MIN_NOTE_GAP`
- `sensitivity` is per-difficulty (higher = fewer notes)

### Highway Renderer (`Highway.js`)
- Canvas fills `#highway-wrap` container (ResizeObserver for responsive resize)
- Perspective math: vanishing point at `(W/2, H*0.06)`, hit zone at `y = H*0.82`
- Notes drawn as rounded-rect gems with highlight stripe and glow shadow
- Hit zone: 5 colored circles with radial gradient fill, key labels
- Particles: gravity-affected sparks (20 for PERFECT, 10 for GOOD, white burst for PERFECT)
- Scrolling horizontal grid bars create depth illusion

### Note Lifecycle (`NoteManager.js`)
- Note `progress` = `(now - spawnTime) / travelTime` (0=top, 1=hit zone)
- `tryHit(lane, nowMs)`: finds closest note, checks `|now - targetTime| <= perfectMs/goodMs`
- Auto-miss: note is missed when `now - targetTime > goodMs * 1.6`

### Scoring (`ScoreSystem.js`)
- PERFECT: 300 pts, GOOD: 100 pts
- Multiplier: `min(4, 1 + floor(combo / 10))` — updates at 10/20/30/40 combo
- Star Power: fills 5.5% per PERFECT (18 perfects = full), drains at 14%/s when active
- Activation: Spacebar / `InputManager.onActivate` → 2× score multiplier
- `hitStates[lane]` decays 0→1 at 8/s for hit zone glow

### Crowd (`CrowdEngine.js`)
- 36 CSS `crowd-fig` divs in `#crowd`, animated by `@keyframes crowd-bob`
- Animation speed and glow controlled by `data-level` attribute on container
- Energy levels: neutral → warm → excited → hyped → star
- Auto-cheer fires on every 10-combo milestone
- Auto-boo fires on 5 consecutive misses with zero combo

## Difficulty Modes

| Mode   | Travel Time | Perfect Window | Sensitivity | Max Lanes |
|--------|-------------|----------------|-------------|-----------|
| EASY   | 1800ms      | ±80ms          | 1.55        | 3         |
| MEDIUM | 1300ms      | ±60ms          | 1.35        | 4         |
| HARD   | 950ms       | ±45ms          | 1.18        | 5         |
| GOD    | 620ms       | ±28ms          | 1.06        | 5         |

## Grading
- **S**: accuracy ≥95% and ≤3 misses
- **A**: accuracy ≥85%
- **B**: accuracy ≥70%
- **C**: accuracy ≥50%
- **F**: below 50%

## Mobile / Touch
- `#touch-zone`: row of 5 colored buttons at bottom (height 60–90px)
- `touchstart` (passive:false, preventDefault) for responsiveness
- Buttons 1–5 hidden when fewer lanes selected
- Viewport meta: no zoom, no user-scale
- Star Power on mobile: ??? (TODO: double-tap or shake gesture)

## Scaling Roadmap

### v0.3 — Feel & Juice
- [ ] Screen shake on miss (CSS transform on `#highway-wrap`)
- [ ] Highway flash/strobe on star power activation
- [ ] Note hold/sustain mechanics
- [ ] Mobile star power: accelerometer shake detection

### v0.4 — Audio Improvements
- [ ] BPM auto-detection from audio stream
- [ ] Beat quantization (snap notes to nearest BPM grid)
- [ ] Better beat detection using onset strength (spectral flux instead of energy ratio)
- [ ] Per-lane audio source filtering (EQ bands for each lane's characteristic sound)

### v0.5 — Content
- [ ] Static pattern files (`patterns/*.json`) for play-along songs
- [ ] In-game pattern editor
- [ ] Song timer + HUD progress bar

### v0.6 — Persistence
- [ ] LocalStorage high scores
- [ ] Ghost/replay system (record keypresses + ms timestamps)

### v1.0 — Build System
- [ ] Migrate to Vite
- [ ] TypeScript
- [ ] Unit tests for `ScoreSystem`, `NoteManager`, beat detection
- [ ] PWA manifest + service worker (offline play)

## Known Limitations / Notes
- System audio capture (`getDisplayMedia`) requires Chrome on desktop; Firefox/Safari may need mic fallback
- Web Audio `AudioContext` must be resumed after user gesture (handled by `selectSource`)
- Note generation only works when audio source is active and playing — silence = no notes
- `getDisplayMedia` on some Chrome versions requires `video:true` even if you only want audio; video track is stopped immediately after capture
