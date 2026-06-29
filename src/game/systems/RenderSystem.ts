import { GunData, BulletData, Particle, DamageNumber, PowerUpSpawn, ArenaConfig, TournamentState, TournamentConfig } from '../types'
import {
  GUN_HEIGHT, BULLET_RADIUS, WALL_THICKNESS, POWERUP_RADIUS,
} from '../constants'

export class RenderSystem {
  private ctx: CanvasRenderingContext2D
  private arena: ArenaConfig

  constructor(ctx: CanvasRenderingContext2D, arena: ArenaConfig) {
    this.ctx = ctx
    this.arena = arena
  }

  setArena(arena: ArenaConfig): void { this.arena = arena }

  private get tw(): number { return this.arena.width + WALL_THICKNESS * 2 }
  private get th(): number { return this.arena.height + WALL_THICKNESS * 2 }

  clear(): void {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
    this.ctx.fillStyle = '#000000'
    this.ctx.fillRect(0, 0, this.tw, this.th)
  }

  applyShake(intensity: number): void {
    if (intensity <= 0) return
    this.ctx.translate((Math.random() - 0.5) * intensity, (Math.random() - 0.5) * intensity)
  }

  drawSlomoVignette(timeScale: number): void {
    const a = Math.max(0, Math.min(1, (1 - timeScale) * 0.6))
    const g = this.ctx.createRadialGradient(this.tw / 2, this.th / 2, this.tw * 0.2, this.tw / 2, this.th / 2, this.tw * 0.7)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, `rgba(0,0,0,${a})`)
    this.ctx.fillStyle = g
    this.ctx.fillRect(0, 0, this.tw, this.th)
  }

  drawPauseOverlay(): void {
    const ctx = this.ctx
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.fillRect(0, 0, this.tw, this.th)

    ctx.save()
    ctx.shadowColor = 'rgba(255,255,255,0.3)'
    ctx.shadowBlur = 20
    ctx.font = 'bold 48px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffffff'
    ctx.fillText('PAUSED', this.tw / 2, this.th / 2 - 20)

    ctx.shadowBlur = 0
    ctx.font = '18px monospace'
    ctx.fillStyle = '#888'
    ctx.fillText('Press SPACE to resume', this.tw / 2, this.th / 2 + 30)
    ctx.restore()
  }

  drawKoText(winnerLabel: string): void {
    const ctx = this.ctx
    ctx.save()
    ctx.shadowColor = 'rgba(255,200,0,0.5)'
    ctx.shadowBlur = 30
    ctx.font = 'bold 72px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffdd44'
    ctx.fillText('K.O.!', this.tw / 2, this.th / 2 - 30)
    ctx.shadowBlur = 0
    ctx.font = '20px monospace'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(`${winnerLabel} lands the final blow`, this.tw / 2, this.th / 2 + 50)
    ctx.restore()
  }

  drawRoundInfo(tournament: TournamentState, config: TournamentConfig): void {
    if (!config.enabled) return
    const ctx = this.ctx
    ctx.font = '13px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#888'
    ctx.fillText(`Round ${tournament.round} — Gun A ${tournament.scoreA} : ${tournament.scoreB} Gun B (First to ${tournament.roundsToWin})`, this.tw / 2, 16)
  }

  drawArena(): void {
    const ctx = this.ctx
    const w = this.arena.width, h = this.arena.height
    ctx.fillStyle = '#2a2a3e'
    ctx.fillRect(0, 0, this.tw, WALL_THICKNESS)
    ctx.fillRect(0, h + WALL_THICKNESS, this.tw, WALL_THICKNESS)
    ctx.fillRect(0, 0, WALL_THICKNESS, this.th)
    ctx.fillRect(w + WALL_THICKNESS, 0, WALL_THICKNESS, this.th)
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(WALL_THICKNESS, WALL_THICKNESS, w, h)
    ctx.strokeStyle = '#555577'
    ctx.lineWidth = 2
    ctx.strokeRect(WALL_THICKNESS, WALL_THICKNESS, w, h)
  }

  drawGun(gun: GunData): void {
    if (gun.health <= 0) return
    const ctx = this.ctx, body = gun.body, len = gun.model.length
    ctx.save()
    ctx.translate(body.position.x, body.position.y)
    ctx.rotate(body.angle)
    ctx.fillStyle = gun.color
    ctx.fillRect(-len / 2, -GUN_HEIGHT / 2, len, GUN_HEIGHT)
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 1
    ctx.strokeRect(-len / 2, -GUN_HEIGHT / 2, len, GUN_HEIGHT)
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.fillRect(len / 2 - 8, -3, 8, 6)
    ctx.restore()
  }

  drawPowerUpIndicators(gun: GunData): void {
    const ctx = this.ctx
    const x = gun.body.position.x, y = gun.body.position.y - GUN_HEIGHT / 2 - 22
    let offset = 0
    if (gun.powerUps.shield) {
      ctx.fillStyle = '#44ddff'
      ctx.font = '11px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('🛡', x + offset, y)
      offset += 16
    }
    if (gun.powerUps.damageBoost) {
      ctx.fillStyle = '#ff8844'
      ctx.font = '11px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('⚡', x + offset, y)
    }
  }

  drawBullet(bullet: BulletData, color: string): void {
    const ctx = this.ctx, x = bullet.body.position.x, y = bullet.body.position.y
    ctx.fillStyle = bullet.critical ? '#ff44ff' : color
    ctx.beginPath()
    ctx.arc(x, y, BULLET_RADIUS, 0, Math.PI * 2)
    ctx.fill()
  }

  drawParticles(particles: Particle[]): void {
    const ctx = this.ctx
    for (const p of particles) {
      const size = p.type === 'smoke' ? p.size * (1 + (1 - p.life / p.maxLife) * 2) : p.size
      ctx.globalAlpha = Math.max(0, p.alpha)
      ctx.fillStyle = p.color
      if (p.type === 'muzzle' || p.type === 'smoke') {
        ctx.beginPath()
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size)
      }
    }
    ctx.globalAlpha = 1
  }

  drawDamageNumbers(numbers: DamageNumber[]): void {
    const ctx = this.ctx
    for (const d of numbers) {
      const alpha = d.life / d.maxLife
      ctx.save()
      ctx.globalAlpha = Math.max(0, alpha)
      ctx.font = `bold ${d.size}px monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = 'rgba(0,0,0,0.8)'
      ctx.shadowBlur = 6
      ctx.fillStyle = d.color
      ctx.fillText(d.text, d.x, d.y)
      ctx.restore()
    }
  }

  drawPowerUps(powerUps: PowerUpSpawn[]): void {
    const ctx = this.ctx, now = Date.now()
    for (const p of powerUps) {
      if (!p.active) continue
      const x = p.body.position.x, y = p.body.position.y
      const pulse = 1 + Math.sin(now / 200) * 0.15
      const r = POWERUP_RADIUS * pulse

      ctx.save()
      ctx.globalAlpha = 0.7 + Math.sin(now / 300) * 0.3
      ctx.shadowColor = p.type === 'shield' ? '#44ddff' : '#ff8844'
      ctx.shadowBlur = 15

      ctx.fillStyle = p.type === 'shield' ? '#44ddff' : '#ff8844'
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()

      ctx.shadowBlur = 0
      ctx.fillStyle = '#ffffff'
      ctx.font = '14px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(p.type === 'shield' ? '🛡' : '⚡', x, y + 1)
      ctx.restore()
    }
  }

  drawHealthBar(gun: GunData): void {
    if (gun.health <= 0) return
    const ctx = this.ctx
    const x = gun.body.position.x, y = gun.body.position.y - GUN_HEIGHT / 2 - 14
    const pct = gun.health / gun.maxHealth
    ctx.fillStyle = '#333'
    ctx.fillRect(x - 25, y, 50, 6)
    ctx.fillStyle = pct > 0.3 ? '#44cc44' : '#ff4444'
    ctx.fillRect(x - 25, y, 50 * pct, 6)
    ctx.strokeStyle = '#555'
    ctx.lineWidth = 1
    ctx.strokeRect(x - 25, y, 50, 6)
  }

  drawHitFlash(gun: GunData, alpha: number): void {
    if (alpha <= 0) return
    const ctx = this.ctx, body = gun.body, len = gun.model.length
    ctx.save()
    ctx.translate(body.position.x, body.position.y)
    ctx.rotate(body.angle)
    ctx.fillStyle = `rgba(255,255,255,${(alpha / 8) * 0.4})`
    ctx.fillRect(-len / 2, -GUN_HEIGHT / 2, len, GUN_HEIGHT)
    ctx.restore()
  }
}
