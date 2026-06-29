import { GunData, BulletData, Particle, ArenaConfig } from '../types'
import {
  GUN_HEIGHT, BULLET_RADIUS, WALL_THICKNESS,
} from '../constants'

export class RenderSystem {
  private ctx: CanvasRenderingContext2D
  private arena: ArenaConfig

  constructor(ctx: CanvasRenderingContext2D, arena: ArenaConfig) {
    this.ctx = ctx
    this.arena = arena
  }

  setArena(arena: ArenaConfig): void {
    this.arena = arena
  }

  private get tw(): number { return this.arena.width + WALL_THICKNESS * 2 }
  private get th(): number { return this.arena.height + WALL_THICKNESS * 2 }

  clear(): void {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
    this.ctx.fillStyle = '#000000'
    this.ctx.fillRect(0, 0, this.tw, this.th)
  }

  applyShake(intensity: number): void {
    if (intensity <= 0) return
    const sx = (Math.random() - 0.5) * intensity
    const sy = (Math.random() - 0.5) * intensity
    this.ctx.translate(sx, sy)
  }

  drawSlomoVignette(timeScale: number): void {
    const ctx = this.ctx
    const alpha = Math.max(0, Math.min(1, (1 - timeScale) * 0.6))
    const gradient = ctx.createRadialGradient(
      this.tw / 2, this.th / 2, this.tw * 0.2,
      this.tw / 2, this.th / 2, this.tw * 0.7,
    )
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
    gradient.addColorStop(1, `rgba(0, 0, 0, ${alpha})`)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, this.tw, this.th)
  }

  drawKoText(winnerLabel: string): void {
    const ctx = this.ctx
    const cx = this.tw / 2
    const cy = this.th / 2 - 30

    ctx.save()
    ctx.shadowColor = 'rgba(255, 200, 0, 0.5)'
    ctx.shadowBlur = 30
    ctx.font = 'bold 72px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffdd44'
    ctx.fillText('K.O.!', cx, cy)

    ctx.shadowBlur = 0
    ctx.font = '20px monospace'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(`${winnerLabel} lands the final blow`, cx, cy + 50)
    ctx.restore()
  }

  drawArena(): void {
    const ctx = this.ctx
    const w = this.arena.width
    const h = this.arena.height

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
    const ctx = this.ctx
    const body = gun.body
    const x = body.position.x
    const y = body.position.y
    const angle = body.angle
    const len = gun.model.length

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)

    ctx.fillStyle = gun.color
    ctx.fillRect(-len / 2, -GUN_HEIGHT / 2, len, GUN_HEIGHT)

    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 1
    ctx.strokeRect(-len / 2, -GUN_HEIGHT / 2, len, GUN_HEIGHT)

    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.fillRect(len / 2 - 8, -3, 8, 6)

    ctx.restore()
  }

  drawBullet(bullet: BulletData, color: string): void {
    const ctx = this.ctx
    const x = bullet.body.position.x
    const y = bullet.body.position.y

    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, BULLET_RADIUS, 0, Math.PI * 2)
    ctx.fill()
  }

  drawParticles(particles: Particle[]): void {
    const ctx = this.ctx
    for (const p of particles) {
      const alpha = p.alpha
      const size = p.type === 'smoke'
        ? p.size * (1 + (1 - p.life / p.maxLife) * 2)
        : p.size

      ctx.globalAlpha = Math.max(0, alpha)

      if (p.type === 'muzzle' || p.type === 'smoke') {
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.fillStyle = p.color
        ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size)
      }
    }
    ctx.globalAlpha = 1
  }

  drawHealthBar(gun: GunData): void {
    if (gun.health <= 0) return
    const ctx = this.ctx
    const x = gun.body.position.x
    const y = gun.body.position.y - GUN_HEIGHT / 2 - 14
    const width = 50
    const height = 6
    const healthPercent = gun.health / gun.maxHealth

    ctx.fillStyle = '#333333'
    ctx.fillRect(x - width / 2, y, width, height)
    ctx.fillStyle = healthPercent > 0.3 ? '#44cc44' : '#ff4444'
    ctx.fillRect(x - width / 2, y, width * healthPercent, height)
    ctx.strokeStyle = '#555555'
    ctx.lineWidth = 1
    ctx.strokeRect(x - width / 2, y, width, height)
  }

  drawHitFlash(gun: GunData, alpha: number): void {
    if (alpha <= 0) return
    const ctx = this.ctx
    const body = gun.body
    const len = gun.model.length

    ctx.save()
    ctx.translate(body.position.x, body.position.y)
    ctx.rotate(body.angle)
    ctx.fillStyle = `rgba(255, 255, 255, ${(alpha / 8) * 0.4})`
    ctx.fillRect(-len / 2, -GUN_HEIGHT / 2, len, GUN_HEIGHT)
    ctx.restore()
  }
}
