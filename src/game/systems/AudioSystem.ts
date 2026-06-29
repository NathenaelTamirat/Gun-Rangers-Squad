export class AudioSystem {
  private _enabled: boolean = true

  constructor() {
    try {
      this._enabled = typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined'
    } catch {
      this._enabled = false
    }
  }

  get enabled(): boolean { return this._enabled }

  setEnabled(val: boolean): void {
    this._enabled = val
  }

  playShoot(): void {
    this.playTone(220, 0.08, 'square', 0.3)
  }

  playHit(): void {
    this.playTone(120, 0.1, 'sawtooth', 0.4)
  }

  playCriticalHit(): void {
    this.playTone(800, 0.15, 'sawtooth', 0.5)
    setTimeout(() => this.playTone(1000, 0.1, 'square', 0.3), 50)
  }

  playWallHit(): void {
    this.playTone(80, 0.06, 'sine', 0.2)
  }

  playVictory(): void {
    this.playTone(440, 0.1, 'sine', 0.3)
    setTimeout(() => this.playTone(554, 0.1, 'sine', 0.3), 100)
    setTimeout(() => this.playTone(659, 0.2, 'sine', 0.3), 200)
  }

  playPowerUpPickup(): void {
    this.playTone(600, 0.08, 'sine', 0.3)
    setTimeout(() => this.playTone(800, 0.08, 'sine', 0.3), 80)
    setTimeout(() => this.playTone(1000, 0.1, 'sine', 0.3), 160)
  }

  playUIClick(): void {
    this.playTone(600, 0.05, 'sine', 0.2)
  }

  private playTone(freq: number, duration: number, type: OscillatorType, volume: number): void {
    if (!this._enabled) return

    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext
      const ctx = new AC()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = type
      osc.frequency.value = freq
      gain.gain.value = volume
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + duration)

      osc.onended = () => ctx.close()
    } catch {
      // Silently fail if audio not available
    }
  }
}
