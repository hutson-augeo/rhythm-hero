import { FREQ_BANDS, MIN_NOTE_GAP } from './config.js'

const FFT_SIZE = 2048
const HISTORY  = 35   // frames of energy history per band

export class AudioEngine {
  constructor() {
    this.ctx       = null
    this.analyser  = null
    this.fftData   = null
    this.histories = FREQ_BANDS.map(() => [])
    this.lastBeat  = new Array(FREQ_BANDS.length).fill(0)  // ms timestamp
    this.stream        = null
    this.source        = null
    this.demoMode      = false
    this._lastDemoStep = -1
  }

  // ── Init AudioContext (must be called after a user gesture) ──────────────
  initContext() {
    if (this.ctx) return
    this.ctx = new (window.AudioContext || window.webkitAudioContext)()
  }

  async selectSource(type) {
    this.initContext()
    if (this.ctx.state === 'suspended') await this.ctx.resume()

    // Demo mode — skip media capture entirely, use synthetic beats
    if (type === 'demo') {
      this.demoMode = true
      return
    }
    this.demoMode = false

    // Guard: media API not available
    if (!navigator.mediaDevices) {
      throw new Error('Media devices not available. Use a modern browser on localhost or HTTPS.')
    }

    // Disconnect previous source
    if (this.source) { try { this.source.disconnect() } catch (_) {} }
    if (this.stream) { this.stream.getTracks().forEach(t => t.stop()) }

    if (type === 'system') {
      if (!navigator.mediaDevices.getDisplayMedia) {
        throw new Error('System audio capture not supported in this browser. Try Chrome on desktop.')
      }
      try {
        this.stream = await navigator.mediaDevices.getDisplayMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
          video: true,  // required by Chrome; discarded immediately
        })
        this.stream.getVideoTracks().forEach(t => t.stop())
        const audioTracks = this.stream.getAudioTracks()
        if (!audioTracks.length) {
          throw new Error('No audio track captured. Make sure to check "Share audio" in the dialog.')
        }
      } catch (err) {
        throw new Error(`System audio: ${err.message}`)
      }
    } else {
      // Microphone
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        })
      } catch (err) {
        throw new Error(`Microphone: ${err.message}`)
      }
    }

    this._connectStream()
  }

  _connectStream() {
    this.analyser          = this.ctx.createAnalyser()
    this.analyser.fftSize  = FFT_SIZE
    this.analyser.smoothingTimeConstant = 0.75
    this.fftData           = new Uint8Array(this.analyser.frequencyBinCount)

    this.source = this.ctx.createMediaStreamSource(this.stream)
    this.source.connect(this.analyser)
    // Note: NOT connected to destination — avoids feedback loop
  }

  // ── Called every game frame ──────────────────────────────────────────────
  // Returns array of 5 booleans: did each band fire a beat this frame?
  getBeats(nowMs, sensitivity, activeLaneCount) {
    if (this.demoMode) return this._demoBeats(nowMs, activeLaneCount)
    if (!this.analyser) return new Array(FREQ_BANDS.length).fill(false)

    this.analyser.getByteFrequencyData(this.fftData)

    return FREQ_BANDS.map((band, i) => {
      // Only check bands within active lane count
      if (i >= activeLaneCount) return false

      const energy = this._bandEnergy(band[0], band[1])
      const hist   = this.histories[i]
      hist.push(energy)
      if (hist.length > HISTORY) hist.shift()

      const avg = hist.reduce((a, b) => a + b, 0) / hist.length
      const threshold = avg * sensitivity

      const beatFired = (
        energy > threshold &&
        energy > 18 &&              // absolute minimum signal
        nowMs - this.lastBeat[i] > MIN_NOTE_GAP
      )

      if (beatFired) this.lastBeat[i] = nowMs
      return beatFired
    })
  }

  // Synthetic beat generator for demo mode (120 BPM, 16-step pattern)
  _demoBeats(nowMs, activeLaneCount) {
    const BEAT_MS = 500  // 120 BPM eighth-notes
    const PATTERNS = [
      [1,0,0,0, 1,0,0,0, 1,0,1,0, 0,0,1,0],
      [0,0,1,0, 0,0,1,0, 0,0,0,1, 1,0,0,0],
      [0,1,0,0, 0,1,0,1, 0,1,0,0, 0,1,0,0],
      [0,0,0,1, 1,0,0,0, 0,0,1,0, 0,0,0,1],
      [1,0,1,0, 0,0,0,0, 1,0,0,1, 0,1,0,0],
    ]
    const step    = Math.floor(nowMs / BEAT_MS) % 16
    const stepped = (step !== this._lastDemoStep)
    this._lastDemoStep = step

    if (!stepped) return new Array(5).fill(false)

    return PATTERNS.map((pat, i) => {
      if (i >= activeLaneCount) return false
      if (!pat[step]) return false
      if (nowMs - this.lastBeat[i] < MIN_NOTE_GAP) return false
      this.lastBeat[i] = nowMs
      return true
    })
  }

  _bandEnergy(start, end) {
    let sum = 0
    for (let i = start; i < end && i < this.fftData.length; i++) {
      sum += this.fftData[i]
    }
    return sum / (end - start)
  }

  // ── Crowd audio synthesis ─────────────────────────────────────────────────
  playCheer(energy = 0.5) {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    const dur = 0.3 + energy * 0.9
    this._playNoise(800 + energy * 500, dur, energy * 0.22, now)
    // Add a second harmonic layer for a fuller cheer
    setTimeout(() => {
      if (!this.ctx) return
      this._playNoise(1200, dur * 0.6, energy * 0.1, this.ctx.currentTime)
    }, 60)
  }

  playBoo() {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    const dur = 0.6
    const buf = this._noiseBuffer(dur)
    const src = this.ctx.createBufferSource()
    src.buffer = buf

    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(500, now)
    filter.frequency.exponentialRampToValueAtTime(160, now + dur)
    filter.Q.value = 1.2

    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0.18, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur)

    src.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination)
    src.start(now)
  }

  playStarPowerSwoosh() {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(200, now)
    osc.frequency.exponentialRampToValueAtTime(1600, now + 0.3)
    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
    osc.connect(gain); gain.connect(this.ctx.destination)
    osc.start(now); osc.stop(now + 0.35)
  }

  _playNoise(freq, dur, vol, now) {
    const buf = this._noiseBuffer(dur)
    const src = this.ctx.createBufferSource()
    src.buffer = buf

    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = freq
    filter.Q.value = 0.6

    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(vol, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur)

    src.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination)
    src.start(now)
  }

  _noiseBuffer(dur) {
    const len = Math.floor(this.ctx.sampleRate * dur)
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const d   = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    return buf
  }

  // ── Hit sound per lane ────────────────────────────────────────────────────
  playHit(lane, perfect) {
    if (!this.ctx) return
    const freqs = [261.6, 293.7, 329.6, 392, 440]  // C D E G A
    const now   = this.ctx.currentTime
    const freq  = freqs[lane] * (perfect ? 2 : 1)
    const dur   = perfect ? 0.18 : 0.1

    const osc  = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = perfect ? 'triangle' : 'square'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(perfect ? 0.35 : 0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur)
    osc.connect(gain); gain.connect(this.ctx.destination)
    osc.start(now); osc.stop(now + dur)
  }

  playMiss() {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.value = 85
    gain.gain.setValueAtTime(0.12, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
    osc.connect(gain); gain.connect(this.ctx.destination)
    osc.start(now); osc.stop(now + 0.14)
  }

  destroy() {
    if (this.source) try { this.source.disconnect() } catch (_) {}
    if (this.stream) this.stream.getTracks().forEach(t => t.stop())
    if (this.ctx)    this.ctx.close()
    this.ctx = null
  }
}
