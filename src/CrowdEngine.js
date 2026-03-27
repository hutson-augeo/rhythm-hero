export class CrowdEngine {
  constructor(audioEngine) {
    this.audio     = audioEngine
    this.energy    = 0.2
    this._booCooldown = 0
    this._cheerCooldown = 0
  }

  // ── Called every frame ────────────────────────────────────────────────────
  update(state, dt) {
    const { combo, misses } = state

    // Smooth energy toward combo-based target
    const target = Math.min(1, combo * 0.04)
    this.energy += (target - this.energy) * (dt * 2)

    // Auto-cheer on high combos
    this._cheerCooldown -= dt
    if (combo > 0 && combo % 10 === 0 && this._cheerCooldown <= 0) {
      this.audio.playCheer(this.energy)
      this._cheerCooldown = 2
    }

    // Boo on consecutive misses
    this._booCooldown -= dt
    if (misses > 0 && misses % 5 === 0 && this._booCooldown <= 0 && combo === 0) {
      this.audio.playBoo()
      this._booCooldown = 3
    }
  }

  cheer(intensity = 0.6) {
    this.audio.playCheer(intensity)
  }

  reset() {
    this.energy = 0.2
    this._booCooldown = 0
    this._cheerCooldown = 0
  }
}
