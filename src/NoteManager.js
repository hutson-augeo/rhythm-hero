let _id = 0

export class NoteManager {
  constructor() {
    this.notes      = []
    this.config     = null
    this.numLanes   = 5
    this._lastSpawn = new Array(5).fill(0)  // per-lane last spawn time
  }

  configure(config, numLanes) {
    this.config   = config
    this.numLanes = numLanes
  }

  // ── Called each frame with beat detection results ─────────────────────────
  spawnFromBeats(beats, nowMs) {
    beats.forEach((fired, lane) => {
      if (!fired) return
      if (lane >= this.numLanes) return
      if (nowMs - this._lastSpawn[lane] < this.config.travelTime * 0.4) return

      this.notes.push({
        id:         ++_id,
        lane,
        spawnTime:  nowMs,
        targetTime: nowMs + this.config.travelTime,
        progress:   0,
        hit:        false,
        missed:     false,
        judgment:   null,
      })
      this._lastSpawn[lane] = nowMs
    })
  }

  // ── Update progress, auto-miss notes past the window ──────────────────────
  update(nowMs) {
    const missBuffer = this.config.goodMs * 1.6  // ms past ideal before auto-miss

    const newlyMissed = []
    for (const note of this.notes) {
      if (note.hit || note.missed) continue
      note.progress = (nowMs - note.spawnTime) / this.config.travelTime

      if (nowMs - note.targetTime > missBuffer) {
        note.missed   = true
        note.judgment = 'miss'
        newlyMissed.push(note)
      }
    }

    // Prune notes that are well off-screen and done
    this.notes = this.notes.filter(n =>
      !n.hit && !n.missed
        ? true
        : n.progress < 1.5   // keep briefly for renderer
    )

    return newlyMissed
  }

  // ── Try to hit the closest note in a lane ─────────────────────────────────
  tryHit(lane, nowMs) {
    const candidates = this.notes.filter(n =>
      n.lane === lane && !n.hit && !n.missed
    )
    if (!candidates.length) return null

    // Closest to targetTime
    candidates.sort((a, b) =>
      Math.abs(nowMs - a.targetTime) - Math.abs(nowMs - b.targetTime)
    )
    const note = candidates[0]
    const delta = Math.abs(nowMs - note.targetTime)

    if (delta <= this.config.perfectMs) {
      note.hit      = true
      note.judgment = 'perfect'
      return { note, judgment: 'perfect' }
    }
    if (delta <= this.config.goodMs) {
      note.hit      = true
      note.judgment = 'good'
      return { note, judgment: 'good' }
    }

    return null  // ghost press / too early
  }

  reset() {
    this.notes = []
    this._lastSpawn.fill(0)
  }
}
