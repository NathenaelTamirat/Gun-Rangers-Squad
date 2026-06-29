import Matter from 'matter-js'
import { GameState, GunData, BulletData, Particle, GameCallbacks, GunSelections } from './types'
import {
  ARENA_WIDTH, ARENA_HEIGHT, WALL_THICKNESS,
  MAX_BULLETS, MAX_PARTICLES, GUN_MODELS,
  COLORS, SLOMO_DURATION, SLOMO_TARGET, SLOMO_FADE_IN,
} from './constants'
import { RandomSystem } from './systems/RandomSystem'
import { SpawnSystem } from './systems/SpawnSystem'
import { AudioSystem } from './systems/AudioSystem'
import { RenderSystem } from './systems/RenderSystem'
import { shoot } from './physics/shooting'
import { applyRecoil } from './physics/recoil'
import {
  isBulletCollision, isGunCollision, getBodyOwnerId,
  isBulletOutOfBounds, getGunIdFromBody,
} from './physics/collisions'
import { getBarrelTip } from './entities/Gun'
import { randRange } from '../utils/math'

export class Game {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private engine: Matter.Engine
  private world: Matter.World
  private guns: Map<string, GunData> = new Map()
  private bullets: BulletData[] = []
  private particles: Particle[] = []
  private state: GameState = 'MENU'
  private nextFireTimer: number = 0
  private callbacks: GameCallbacks
  private rafId: number = 0
  private lastTimestamp: number = 0
  private randomSystem: RandomSystem
  private spawnSystem: SpawnSystem
  private audioSystem: AudioSystem
  private renderSystem: RenderSystem
  private bodiesToRemove: Matter.Body[] = []
  private hitFlashTimers: Map<string, number> = new Map()
  private shakeIntensity: number = 0
  private timeScale: number = 1
  private slomoStartTime: number = 0
  private selections: GunSelections = { gunA: 'pistol', gunB: 'pistol' }

  constructor(canvas: HTMLCanvasElement, callbacks: GameCallbacks) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.callbacks = callbacks

    canvas.width = ARENA_WIDTH + WALL_THICKNESS * 2
    canvas.height = ARENA_HEIGHT + WALL_THICKNESS * 2

    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: 0 },
      enableSleeping: false,
    })
    this.world = this.engine.world

    this.randomSystem = new RandomSystem()
    this.spawnSystem = new SpawnSystem()
    this.audioSystem = new AudioSystem()
    this.renderSystem = new RenderSystem(this.ctx)

    this.createWalls()
    this.setupCollisions()

    this.lastTimestamp = performance.now()
    this.gameLoop(this.lastTimestamp)
  }

  private createWalls(): void {
    const wallOpts: Matter.IBodyDefinition = {
      isStatic: true,
      restitution: 0.5,
      friction: 0.8,
      label: 'wall',
      collisionFilter: {
        category: 0x0001,
        mask: 0x0002 | 0x0004,
      },
    }

    const walls = [
      Matter.Bodies.rectangle(
        WALL_THICKNESS + ARENA_WIDTH / 2, WALL_THICKNESS / 2 - 10,
        ARENA_WIDTH + WALL_THICKNESS * 2, WALL_THICKNESS + 20,
        wallOpts,
      ),
      Matter.Bodies.rectangle(
        WALL_THICKNESS + ARENA_WIDTH / 2, WALL_THICKNESS + ARENA_HEIGHT + WALL_THICKNESS / 2 + 10,
        ARENA_WIDTH + WALL_THICKNESS * 2, WALL_THICKNESS + 20,
        wallOpts,
      ),
      Matter.Bodies.rectangle(
        WALL_THICKNESS / 2 - 10, WALL_THICKNESS + ARENA_HEIGHT / 2,
        WALL_THICKNESS + 20, ARENA_HEIGHT,
        wallOpts,
      ),
      Matter.Bodies.rectangle(
        WALL_THICKNESS + ARENA_WIDTH + WALL_THICKNESS / 2 + 10, WALL_THICKNESS + ARENA_HEIGHT / 2,
        WALL_THICKNESS + 20, ARENA_HEIGHT,
        wallOpts,
      ),
    ]

    Matter.Composite.add(this.world, walls)
  }

  private setupCollisions(): void {
    Matter.Events.on(this.engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        this.handleCollision(pair.bodyA, pair.bodyB)
      }
    })
  }

  private handleCollision(bodyA: Matter.Body, bodyB: Matter.Body): void {
    if (this.state !== 'BATTLE') return

    const isBulletA = isBulletCollision(bodyA)
    const isBulletB = isBulletCollision(bodyB)
    const isGunA = isGunCollision(bodyA)
    const isGunB = isGunCollision(bodyB)

    if (isBulletA && isGunB) {
      this.handleBulletHitGun(bodyA, bodyB)
    } else if (isBulletB && isGunA) {
      this.handleBulletHitGun(bodyB, bodyA)
    } else if (isBulletA && bodyB.label === 'wall') {
      this.handleBulletHitWall(bodyA)
    } else if (isBulletB && bodyA.label === 'wall') {
      this.handleBulletHitWall(bodyB)
    }
  }

  private handleBulletHitGun(bulletBody: Matter.Body, gunBody: Matter.Body): void {
    const bulletOwner = getBodyOwnerId(bulletBody)
    const gunId = getGunIdFromBody(gunBody)

    if (bulletOwner === gunId) return

    const bulletIdx = this.bullets.findIndex(b => b.body === bulletBody)
    if (bulletIdx === -1) return

    const bullet = this.bullets[bulletIdx]
    const targetGun = this.guns.get(gunId)
    const attackerGun = this.guns.get(bulletOwner)
    if (!targetGun || !attackerGun) return

    targetGun.health = Math.max(0, targetGun.health - bullet.damage)

    const tip = getBarrelTip(gunBody, targetGun.model.length)
    this.spawnHitSparks(tip.x, tip.y)
    this.spawnSmoke(tip.x, tip.y, 5)
    this.audioSystem.playHit()
    this.hitFlashTimers.set(gunId, 8)
    this.shakeIntensity = 6

    const hpA = this.guns.get('A')?.health ?? 0
    const hpB = this.guns.get('B')?.health ?? 0
    this.callbacks.onHealthChange(hpA, hpB)

    this.bodiesToRemove.push(bullet.body)
    this.bullets.splice(bulletIdx, 1)

    if (targetGun.health <= 0) {
      this.state = 'SLOMO'
      this.slomoStartTime = performance.now()
      this.timeScale = 1
      this.callbacks.onStateChange('SLOMO')
      this.callbacks.onWinner(attackerGun.id)
    }
  }

  private handleBulletHitWall(bulletBody: Matter.Body): void {
    const idx = this.bullets.findIndex(b => b.body === bulletBody)
    if (idx === -1) return

    const { x, y } = bulletBody.position
    this.spawnDust(x, y)
    this.audioSystem.playWallHit()

    this.bodiesToRemove.push(bulletBody)
    this.bullets.splice(idx, 1)
  }

  startBattle(selections?: GunSelections): void {
    if (selections) this.selections = selections
    this.cleanup()
    this.state = 'SPAWN'
    this.callbacks.onStateChange('SPAWN')

    const modelA = GUN_MODELS[this.selections.gunA] ?? GUN_MODELS.pistol
    const modelB = GUN_MODELS[this.selections.gunB] ?? GUN_MODELS.pistol

    const { gunA, gunB } = this.spawnSystem.spawnGuns(this.world, modelA, modelB, this.callbacks)
    this.guns.set('A', gunA)
    this.guns.set('B', gunB)

    this.state = 'BATTLE'
    this.nextFireTimer = 1500
    this.timeScale = 1
    this.lastTimestamp = performance.now()
    this.callbacks.onStateChange('BATTLE')
  }

  private fireGun(gunId: string): void {
    const gun = this.guns.get(gunId)
    if (!gun || gun.health <= 0) return

    const bulletDataList = shoot(gun.body, gunId, this.world, gun.model)
    if (!bulletDataList.length) return

    for (const bulletData of bulletDataList) {
      if (this.bullets.length >= MAX_BULLETS) {
        const oldest = this.bullets.shift()
        if (oldest) Matter.Composite.remove(this.world, oldest.body)
      }
      this.bullets.push(bulletData)
    }

    applyRecoil(gun.body, gun.model.length, gun.model.recoilForce)

    const tip = getBarrelTip(gun.body, gun.model.length)
    this.spawnMuzzleFlash(tip.x, tip.y)
    this.spawnSmoke(tip.x, tip.y, 2)
    this.audioSystem.playShoot()
  }

  private gameLoop = (timestamp: number): void => {
    const rawDelta = Math.min(timestamp - this.lastTimestamp, 50)
    this.lastTimestamp = timestamp

    if (this.state === 'BATTLE') {
      Matter.Engine.update(this.engine, rawDelta)
      this.processRemovals()
      this.cleanupBullets()
      this.updateFiring(rawDelta)
    } else if (this.state === 'SLOMO') {
      const elapsed = timestamp - this.slomoStartTime
      this.timeScale = this.computeSlomoScale(elapsed)

      Matter.Engine.update(this.engine, rawDelta * this.timeScale)
      this.processRemovals()

      if (elapsed >= SLOMO_DURATION) {
        this.state = 'VICTORY'
        this.timeScale = 1
        this.audioSystem.playVictory()
        this.callbacks.onStateChange('VICTORY')
      }
    }

    this.updateParticles(rawDelta)
    this.updateHitFlashes()
    this.updateShake()

    this.renderSystem.clear()
    this.renderSystem.applyShake(this.shakeIntensity)

    if (this.state === 'SLOMO') {
      this.renderSystem.drawSlomoVignette(this.timeScale)
    }

    this.renderSystem.drawArena()

    if (this.state !== 'MENU') {
      const gunA = this.guns.get('A')
      const gunB = this.guns.get('B')

      if (gunA) {
        this.renderSystem.drawGun(gunA)
        this.renderSystem.drawHealthBar(gunA)
        this.renderSystem.drawHitFlash(gunA, this.hitFlashTimers.get('A') ?? 0)
      }
      if (gunB) {
        this.renderSystem.drawGun(gunB)
        this.renderSystem.drawHealthBar(gunB)
        this.renderSystem.drawHitFlash(gunB, this.hitFlashTimers.get('B') ?? 0)
      }

      for (const bullet of this.bullets) {
        const gun = this.guns.get(bullet.ownerId)
        const color = gun?.bulletColor ?? COLORS.BULLET_A
        this.renderSystem.drawBullet(bullet, color)
      }
    }

    this.renderSystem.drawParticles(this.particles)

    if (this.state === 'SLOMO') {
      const winner = this.guns.get(this.getWinnerId())?.label ?? 'Unknown'
      this.renderSystem.drawKoText(winner)
    }

    this.rafId = requestAnimationFrame(this.gameLoop)
  }

  private computeSlomoScale(elapsed: number): number {
    if (elapsed < SLOMO_FADE_IN) {
      const t = elapsed / SLOMO_FADE_IN
      return 1 - (1 - SLOMO_TARGET) * t
    }
    if (elapsed < SLOMO_DURATION - SLOMO_FADE_IN) {
      return SLOMO_TARGET
    }
    const t = (elapsed - (SLOMO_DURATION - SLOMO_FADE_IN)) / SLOMO_FADE_IN
    return SLOMO_TARGET + (1 - SLOMO_TARGET) * t
  }

  private getWinnerId(): string {
    for (const [id, gun] of this.guns) {
      if (gun.health > 0) return id
    }
    return this.guns.keys().next().value ?? 'A'
  }

  private processRemovals(): void {
    for (const body of this.bodiesToRemove) {
      Matter.Composite.remove(this.world, body)
    }
    this.bodiesToRemove = []
  }

  private cleanupBullets(): void {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      if (isBulletOutOfBounds(this.bullets[i].body)) {
        this.bodiesToRemove.push(this.bullets[i].body)
        this.bullets.splice(i, 1)
      }
    }
  }

  private updateFiring(delta: number): void {
    this.nextFireTimer -= delta
    if (this.nextFireTimer <= 0) {
      const aliveGuns: string[] = []
      for (const [id, gun] of this.guns) {
        if (gun.health > 0) aliveGuns.push(id)
      }

      if (aliveGuns.length <= 1) {
        return
      }

      const shooter = this.randomSystem.pickShooter(aliveGuns)
      this.fireGun(shooter)

      const gun = this.guns.get(shooter)
      if (gun) {
        this.nextFireTimer = this.randomSystem.nextFireDelay(
          gun.model.fireCooldownMin,
          gun.model.fireCooldownMax,
        )
      }
    }
  }

  private updateParticles(delta: number): void {
    const speed = this.state === 'SLOMO' ? Math.max(this.timeScale, 0.3) : 1
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx * speed
      p.y += p.vy * speed
      p.life--
      p.alpha = p.life / p.maxLife

      if (p.life <= 0) {
        this.particles.splice(i, 1)
      }
    }

    if (this.particles.length > MAX_PARTICLES) {
      this.particles.splice(0, this.particles.length - MAX_PARTICLES)
    }
  }

  private updateShake(): void {
    if (this.shakeIntensity > 0) {
      this.shakeIntensity = Math.max(0, this.shakeIntensity - 0.5)
    }
  }

  private updateHitFlashes(): void {
    for (const [id, timer] of this.hitFlashTimers) {
      const newVal = timer - 1
      if (newVal <= 0) {
        this.hitFlashTimers.delete(id)
      } else {
        this.hitFlashTimers.set(id, newVal)
      }
    }
  }

  private spawnMuzzleFlash(x: number, y: number): void {
    for (let i = 0; i < 5; i++) {
      if (this.particles.length >= MAX_PARTICLES) break
      this.particles.push({
        x, y,
        vx: 0, vy: 0,
        life: 4, maxLife: 4,
        color: COLORS.MUZZLE_FLASH,
        size: 6 + Math.random() * 4,
        alpha: 1,
        type: 'muzzle',
      })
    }
  }

  private spawnSmoke(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -Math.random() * 0.5 - 0.2,
        life: 30, maxLife: 30,
        color: COLORS.SMOKE,
        size: 3 + Math.random() * 3,
        alpha: 0.6,
        type: 'smoke',
      })
    }
  }

  private spawnHitSparks(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      if (this.particles.length >= MAX_PARTICLES) break
      const angle = randRange(0, Math.PI * 2)
      const speed = randRange(2, 6)
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 20, maxLife: 20,
        color: COLORS.SPARK,
        size: randRange(2, 4),
        alpha: 1,
        type: 'spark',
      })
    }
  }

  private spawnDust(x: number, y: number): void {
    for (let i = 0; i < 4; i++) {
      if (this.particles.length >= MAX_PARTICLES) break
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 15, maxLife: 15,
        color: COLORS.DUST,
        size: 2 + Math.random() * 2,
        alpha: 0.5,
        type: 'dust',
      })
    }
  }

  reset(): void {
    this.cleanup()
    this.state = 'MENU'
    this.timeScale = 1
    this.callbacks.onStateChange('MENU')
    this.callbacks.onHealthChange(100, 100)
  }

  private cleanup(): void {
    for (const bullet of this.bullets) {
      Matter.Composite.remove(this.world, bullet.body)
    }
    this.bullets = []

    for (const gun of this.guns.values()) {
      Matter.Composite.remove(this.world, gun.body)
    }
    this.guns.clear()
    this.particles = []
    this.bodiesToRemove = []
    this.hitFlashTimers.clear()
    this.shakeIntensity = 0
    this.timeScale = 1
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId)
    Matter.Engine.clear(this.engine)
  }
}
