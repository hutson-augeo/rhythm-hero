export class CrowdEngine {
  constructor(audioEngine, container) {
    this.audio     = audioEngine
    this.container = container
    this.energy    = 0.2
    this._booCooldown = 0
    this._cheerCooldown = 0
    this._buildCrowd()
  }

  _buildCrowd() {
    // Generate 36 crowd silhouette divs across the strip
    for (let i = 0; i < 36; i++) {
      const fig = document.createElement('div')
      fig.className = 'crowd-fig'
      fig.style.setProperty('--i', i)
      fig.style.setProperty('--rand', (Math.random()).toFixed(3))
      fig.style.left = `${(i / 36) * 100}%`
      this.container.appendChild(fig)
    }
  }

  // ── Called every frame ────────────────────────────────────────────────────
  update(state, dt) {
    const { combo, misses, starActive } = state

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

    // Update visual energy class
    const level = starActive     ? 'star'    :
                  this.energy > 0.75 ? 'hyped'   :
                  this.energy > 0.45 ? 'excited' :
                  this.energy > 0.2  ? 'warm'    : 'neutral'

    if (this.container.dataset.level !== level) {
      this.container.dataset.level = level
    }
    this.container.style.setProperty('--energy', this.energy.toFixed(3))
  }

  cheer(intensity = 0.6) {
    this.audio.playCheer(intensity)
  }

  reset() {
    this.energy = 0.2
    this._booCooldown = 0
    this._cheerCooldown = 0
    this.container.dataset.level = 'neutral'
  }
}
