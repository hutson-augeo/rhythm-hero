# Rhythm Game — CLAUDE.md

## Project Overview
A browser-based rhythm game using keys 1–5. Notes fall in 5 lanes; hit them as they reach the judgment line to score points. Built with vanilla HTML/CSS/JS and the Web Audio API (no dependencies).

## Current State (v0.1)
- Single HTML file + JS + CSS (no build step)
- 5 lanes, keys 1–5
- Web Audio API for procedurally generated hit sounds (no audio files needed)
- Score, combo, and miss tracking
- Auto-generated note patterns that loop

## Architecture

```
rhythm-game/
├── index.html        # Entry point
├── style.css         # Layout, lanes, notes, animations
├── game.js           # Game loop, input, scoring, audio
└── CLAUDE.md         # This file
```

## Core Systems

### Game Loop (`game.js`)
- `requestAnimationFrame` loop drives note position updates
- Notes are objects: `{ lane, y, hit, missed, el }`
- Note speed controlled by `NOTE_SPEED` constant (px/frame)
- Pattern scheduler fires new notes on a beat interval

### Audio (`game.js → AudioContext`)
- Web Audio API — no files needed
- Each lane (1–5) plays a different pitched tone on hit
- Miss plays a low buzz
- Beat metronome tick (optional, toggleable)

### Scoring
- Perfect hit (within ±20px of line): 300 pts + combo multiplier
- Good hit (within ±50px): 100 pts
- Miss: combo reset

## Planned Scaling Milestones

### v0.2 — Polish
- [ ] Visual feedback (flash on hit/miss, lane highlights)
- [ ] Difficulty selector (slow / normal / fast)
- [ ] Song timer + end screen with grade (S/A/B/C/F)

### v0.3 — Audio
- [ ] Load custom audio files (MP3/OGG) via drag-and-drop or file picker
- [ ] Beat-sync: detect BPM from audio and align note generation
- [ ] Per-lane sound customization

### v0.4 — Content
- [ ] Song/pattern editor (click to place notes, export JSON)
- [ ] Bundled pattern files (`patterns/*.json`)
- [ ] Pattern loader from URL hash (`#pattern=my-song`)

### v0.5 — Persistence
- [ ] LocalStorage high scores per pattern
- [ ] Replay system (record keypresses + timestamps, replay for ghost)

### v1.0 — Build System
- [ ] Add Vite for bundling
- [ ] TypeScript migration
- [ ] Component split: `AudioEngine`, `NoteRenderer`, `ScoreTracker`, `PatternLoader`
- [ ] Unit tests for scoring logic

## Development Notes
- Keep zero dependencies until v1.0 build-system milestone
- Web Audio `AudioContext` must be resumed on first user gesture (browser policy)
- Note hit detection runs in the game loop — keep it O(n) where n = visible notes
- CSS transforms (translateY) are used for note movement — avoids layout thrash

## Running Locally
```bash
# Any static file server works:
npx serve .
# or
python3 -m http.server 8080
# then open http://localhost:8080
```
