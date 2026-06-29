import Matter from 'matter-js'
import {
  GameState, GunData, BulletData, Particle, DamageNumber,
  PowerUpSpawn, PowerUpType, GameCallbacks,
  GunSelections, ArenaConfig, PhysicsSettings, BattleStats,
  TournamentState, TournamentConfig,
} from './types'
import {
  WALL_THICKNESS, MAX_BULLETS, MAX_PARTICLES, MAX_DAMAGE_NUMBERS,
  GUN_MODELS, COLORS,
  SLOMO_DURATION, SLOMO_TARGET, SLOMO_FADE_IN,
  GUN_RESTITUTION, GUN_FRICTION,
  CRITICAL_CHANCE, CRITICAL_MULTIPLIER,
  POWERUP_SPAWN_INTERVAL, POWERUP_RADIUS,
  POWERUP_SHIELD_DURATION, POWERUP_DAMAGE_DURATION, POWERUP_MAX_ACTIVE,
  DAMAGE_NUMBER_LIFE, GUN_HEALTH,
} from './constants'
import { ARENAS, DEFAULT_SETTINGS } from './arenas'
import { RandomSystem } from './systems/RandomSystem'
import { SpawnSystem } from './systems/SpawnSystem'
import { AudioSystem } from './systems/AudioSystem'
import { RenderSystem } from './systems/RenderSystem'
import { StatsSystem } from './systems/StatsSystem'
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
  private damageNumbers: DamageNumber[] = []
  private powerUps: PowerUpSpawn[] = []
  private powerUpTimer: number = POWERUP_SPAWN_INTERVAL
  private state: GameState = 'MENU'
  private prevState: GameState = 'MENU'
  private nextFireTimer: number = 0
  private callbacks: GameCallbacks
  private rafId: number = 0
  private lastTimestamp: number = 0
  private randomSystem: RandomSystem
  private spawnSystem: SpawnSystem
  private audioSystem: AudioSystem
  private renderSystem: RenderSystem
  private statsSystem: StatsSystem
  private bodiesToRemove: Matter.Body[] = []
  private hitFlashTimers: Map<string, number> = new Map()
  private shakeIntensity: number = 0
  private timeScale: number = 1
  private slomoStartTime: number = 0
  private selections: GunSelections = { gunA: 'pistol', gunB: 'pistol' }
  private arena: ArenaConfig = ARENAS.standard
  private settings: PhysicsSettings = { ...DEFAULT_SETTINGS }
  private winnerId: string = ''
  private tournament: TournamentState = { scoreA: 0, scoreB: 0, round: 1, roundsToWin: 2 }
  private tournamentConfig: TournamentConfig = { enabled: false, bestOf: 3 }
  private boundKeyHandler: (e: KeyboardEvent) => void

  constructor(canvas: HTMLCanvasElement, callbacks: GameCallbacks) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.callbacks = callbacks

    this.engine = Matter.Engine.create({ gravity: { x: 0, y: 0 }, enableSleeping: false })
    this.world = this.engine.world

    this.randomSystem = new RandomSystem()
    this.spawnSystem = new SpawnSystem()
    this.audioSystem = new AudioSystem()
    this.renderSystem = new RenderSystem(this.ctx, this.arena)
    this.statsSystem = new StatsSystem()

    this.resizeCanvas()
    this.createWalls()
    this.setupCollisions()

    this.boundKeyHandler = this.handleKeyDown.bind(this)
    window.addEventListener('keydown', this.boundKeyHandler)

    this.lastTimestamp = performance.now()
    this.gameLoop(this.lastTimestamp)
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      e.preventDefault()
      if (this.state === 'BATTLE') {
        this.prevState = this.state
        this.state = 'PAUSED'
        this.callbacks.onStateChange('PAUSED')
      } else if (this.state === 'PAUSED') {
        this.state = this.prevState
        this.lastTimestamp = performance.now()
        this.callbacks.onStateChange(this.state)
      }
    }
  }

  private resizeCanvas(): void {
    this.canvas.width = this.arena.width + WALL_THICKNESS * 2
    this.canvas.height = this.arena.height + WALL_THICKNESS * 2
  }

  private createWalls(): void {
    const existing = Matter.Composite.allBodies(this.world).filter(b => b.isStatic)
    for (const w of existing) Matter.Composite.remove(this.world, w)

    const w = this.arena.width
    const h = this.arena.height
    const opts: Matter.IBodyDefinition = {
      isStatic: true,
      restitution: GUN_RESTITUTION * this.settings.restitutionMultiplier,
      friction: GUN_FRICTION,
      label: 'wall',
      collisionFilter: { category: 0x0001, mask: 0x0002 | 0x0004 },
    }

    const walls = [
      Matter.Bodies.rectangle(WALL_THICKNESS + w / 2, WALL_THICKNESS / 2 - 10, w + WALL_THICKNESS * 2, WALL_THICKNESS + 20, opts),
      Matter.Bodies.rectangle(WALL_THICKNESS + w / 2, WALL_THICKNESS + h + WALL_THICKNESS / 2 + 10, w + WALL_THICKNESS * 2, WALL_THICKNESS + 20, opts),
      Matter.Bodies.rectangle(WALL_THICKNESS / 2 - 10, WALL_THICKNESS + h / 2, WALL_THICKNESS + 20, h, opts),
      Matter.Bodies.rectangle(WALL_THICKNESS + w + WALL_THICKNESS / 2 + 10, WALL_THICKNESS + h / 2, WALL_THICKNESS + 20, h, opts),
    ]
    Matter.Composite.add(this.world, walls)
  }

  private setupCollisions(): void {
    Matter.Events.on(this.engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) this.handleCollision(pair.bodyA, pair.bodyB)
    })
  }

  private handleCollision(bodyA: Matter.Body, bodyB: Matter.Body): void {
    if (this.state !== 'BATTLE') return

    const isBulletA = isBulletCollision(bodyA), isBulletB = isBulletCollision(bodyB)
    const isGunA = isGunCollision(bodyA), isGunB = isGunCollision(bodyB)
    const isPUpA = bodyA.label.startsWith('powerup-'), isPUpB = bodyB.label.startsWith('powerup-')

    if (isBulletA && isGunB) this.handleBulletHitGun(bodyA, bodyB)
    else if (isBulletB && isGunA) this.handleBulletHitGun(bodyB, bodyA)
    else if (isBulletA && bodyB.label === 'wall') this.handleBulletHitWall(bodyA)
    else if (isBulletB && bodyA.label === 'wall') this.handleBulletHitWall(bodyB)
    else if (isGunA && isPUpB) this.handlePowerUpPickup(bodyA, bodyB)
    else if (isGunB && isPUpA) this.handlePowerUpPickup(bodyB, bodyA)
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

    let damage = bullet.damage
    const crit = bullet.critical

    if (targetGun.powerUps.shield) {
      targetGun.powerUps.shield = false
      damage = 0
      this.spawnDamageNumber(gunBody.position.x, gunBody.position.y - 20, 'BLOCKED!', '#44ddff', 16)
    }

    targetGun.health = Math.max(0, targetGun.health - damage)

    const tip = getBarrelTip(gunBody, targetGun.model.length)
    this.spawnHitSparks(tip.x, tip.y)
    this.spawnSmoke(tip.x, tip.y, 5)

    if (crit) {
      this.audioSystem.playCriticalHit()
      this.spawnDamageNumber(tip.x, tip.y, `CRIT ${damage}`, '#ff44ff', 20)
    } else {
      this.audioSystem.playHit()
      if (damage > 0) this.spawnDamageNumber(tip.x, tip.y, `-${damage}`, '#ff8844', 14)
    }

    this.hitFlashTimers.set(gunId, 8)
    this.shakeIntensity = crit ? 10 : 6

    if (damage > 0) {
      this.statsSystem.recordHit(bulletOwner, damage)
    }

    const hpA = this.guns.get('A')?.health ?? 0
    const hpB = this.guns.get('B')?.health ?? 0
    this.callbacks.onHealthChange(hpA, hpB)

    this.bodiesToRemove.push(bullet.body)
    this.bullets.splice(bulletIdx, 1)

    if (targetGun.health <= 0) {
      this.winnerId = attackerGun.id
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
    this.statsSystem.recordWallBounce()
    this.bodiesToRemove.push(bulletBody)
    this.bullets.splice(idx, 1)
  }

  private handlePowerUpPickup(gunBody: Matter.Body, pUpBody: Matter.Body): void {
    const gunId = getGunIdFromBody(gunBody)
    const gun = this.guns.get(gunId)
    if (!gun) return

    const pIdx = this.powerUps.findIndex(p => p.body === pUpBody)
    if (pIdx === -1) return

    const pUp = this.powerUps[pIdx]
    if (!pUp.active) return

    pUp.active = false

    if (pUp.type === 'shield') {
      gun.powerUps.shield = true
      this.spawnDamageNumber(gunBody.position.x, gunBody.position.y - 30, 'SHIELD!', '#44ddff', 16)
    } else if (pUp.type === 'damageBoost') {
      gun.powerUps.damageBoost = true
      this.spawnDamageNumber(gunBody.position.x, gunBody.position.y - 30, 'DMG BOOST!', '#ff8844', 16)
    }

    this.audioSystem.playPowerUpPickup()
    this.bodiesToRemove.push(pUp.body)
    this.powerUps.splice(pIdx, 1)
  }

  startBattle(config: {
    selections?: GunSelections
    arena?: string
    settings?: PhysicsSettings
    predictedWinner?: string | null
    tournament?: TournamentConfig
  }): void {
    if (config.selections) this.selections = config.selections
    if (config.arena && ARENAS[config.arena]) {
      this.arena = ARENAS[config.arena]
      this.renderSystem.setArena(this.arena)
      this.resizeCanvas()
    }
    if (config.settings) {
      this.settings = config.settings
      this.applySettings()
    }
    if (config.tournament) {
      this.tournamentConfig = config.tournament
      const rtw = Math.ceil(config.tournament.bestOf / 2)
      if (this.tournament.round === 1) {
        this.tournament = { scoreA: 0, scoreB: 0, round: 1, roundsToWin: rtw }
      }
    }

    this.cleanup()
    this.createWalls()
    this.statsSystem.reset()

    this.state = 'SPAWN'
    this.callbacks.onStateChange('SPAWN')

    const modelA = GUN_MODELS[this.selections.gunA] ?? GUN_MODELS.pistol
    const modelB = GUN_MODELS[this.selections.gunB] ?? GUN_MODELS.pistol
    const { gunA, gunB } = this.spawnSystem.spawnGuns(this.world, modelA, modelB, this.arena, this.callbacks)
    this.guns.set('A', gunA)
    this.guns.set('B', gunB)

    this.state = 'BATTLE'
    this.nextFireTimer = 1500
    this.timeScale = 1
    this.lastTimestamp = performance.now()
    this.callbacks.onStateChange('BATTLE')

    this.powerUpTimer = POWERUP_SPAWN_INTERVAL
  }

  private applySettings(): void {
    this.engine.gravity.x = this.settings.gravityX
    this.engine.gravity.y = this.settings.gravityY
  }

  private fireGun(gunId: string): void {
    const gun = this.guns.get(gunId)
    if (!gun || gun.health <= 0) return

    const model = gun.model
    const speedMul = this.settings.bulletSpeedMultiplier
    const recoilMul = this.settings.recoilMultiplier
    let damageMul = 1

    if (gun.powerUps.damageBoost) {
      damageMul = 2
      gun.powerUps.damageBoost = false
    }

    const crit = Math.random() < CRITICAL_CHANCE
    const finalDamage = Math.round(model.damage * damageMul * (crit ? CRITICAL_MULTIPLIER : 1))
    const adjustedModel = {
      ...model,
      bulletSpeed: model.bulletSpeed * speedMul,
      recoilForce: model.recoilForce * recoilMul,
      damage: finalDamage,
    }

    const bulletDataList = shoot(gun.body, gunId, this.world, adjustedModel)
    for (const bd of bulletDataList) {
      bd.critical = crit
      if (this.bullets.length >= MAX_BULLETS) {
        const oldest = this.bullets.shift()
        if (oldest) Matter.Composite.remove(this.world, oldest.body)
      }
      this.bullets.push(bd)
    }

    applyRecoil(gun.body, model.length, adjustedModel.recoilForce)
    this.statsSystem.recordShot(gunId)
    if (crit) this.statsSystem.recordCritical(gunId)

    const tip = getBarrelTip(gun.body, model.length)
    this.spawnMuzzleFlash(tip.x, tip.y)
    this.spawnSmoke(tip.x, tip.y, 2)
    this.audioSystem.playShoot()

    if (crit) {
      for (let i = 0; i < 12; i++) {
        if (this.particles.length >= MAX_PARTICLES) break
        const a = randRange(0, Math.PI * 2)
        const s = randRange(3, 8)
        this.particles.push({ x: tip.x, y: tip.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 15, maxLife: 15, color: COLORS.CRITICAL, size: randRange(2, 5), alpha: 1, type: 'spark' })
      }
    }
  }

  private gameLoop = (timestamp: number): void => {
    const rawDelta = Math.min(timestamp - this.lastTimestamp, 50)
    this.lastTimestamp = timestamp

    if (this.state === 'BATTLE') {
      Matter.Engine.update(this.engine, rawDelta)
      this.processRemovals()
      this.cleanupBullets()
      this.updateFiring(rawDelta)
      this.updatePowerUpSpawning(rawDelta)
      this.checkPowerUpPickups()
    } else if (this.state === 'SLOMO') {
      const elapsed = timestamp - this.slomoStartTime
      this.timeScale = this.computeSlomoScale(elapsed)
      Matter.Engine.update(this.engine, rawDelta * this.timeScale)
      this.processRemovals()

      if (elapsed >= SLOMO_DURATION) {
        this.endBattle()
      }
    }

    this.updateParticles(rawDelta)
    this.updateDamageNumbers()
    this.updateHitFlashes()
    this.updateShake()

    this.renderSystem.clear()
    this.renderSystem.applyShake(this.shakeIntensity)

    if (this.state === 'SLOMO') this.renderSystem.drawSlomoVignette(this.timeScale)
    if (this.state === 'PAUSED') this.renderSystem.drawPauseOverlay()

    this.renderSystem.drawArena()

    if (this.state !== 'MENU') {
      for (const [_, gun] of this.guns) {
        if (gun.health > 0) {
          this.renderSystem.drawGun(gun)
          this.renderSystem.drawHealthBar(gun)
          this.renderSystem.drawHitFlash(gun, this.hitFlashTimers.get(gun.id) ?? 0)
          this.renderSystem.drawPowerUpIndicators(gun)
        }
      }

      for (const bullet of this.bullets) {
        const g = this.guns.get(bullet.ownerId)
        this.renderSystem.drawBullet(bullet, g?.bulletColor ?? COLORS.BULLET_A)
      }
    }

    this.renderSystem.drawPowerUps(this.powerUps)
    this.renderSystem.drawParticles(this.particles)
    this.renderSystem.drawDamageNumbers(this.damageNumbers)

    if (this.state === 'SLOMO') {
      const label = this.guns.get(this.winnerId)?.label ?? 'Unknown'
      this.renderSystem.drawKoText(label)
    }

    if (this.state === 'BATTLE' || this.state === 'PAUSED') {
      this.renderSystem.drawRoundInfo(this.tournament, this.tournamentConfig)
    }

    this.rafId = requestAnimationFrame(this.gameLoop)
  }

  private endBattle(): void {
    this.state = 'VICTORY'
    this.timeScale = 1
    this.audioSystem.playVictory()
    this.callbacks.onStateChange('VICTORY')

    const stats = this.statsSystem.getStats(this.winnerId)
    this.callbacks.onStatsUpdate?.(stats)

    const predicted = (window as any).__betPrediction
    if (predicted) {
      const correct = predicted === this.winnerId
      const key = 'recoil_duel_bet'
      const data = JSON.parse(localStorage.getItem(key) || '{"streak":0,"total":0}')
      if (correct) { data.streak++; data.total++ } else { data.streak = 0 }
      localStorage.setItem(key, JSON.stringify(data))
      this.callbacks.onBetResult?.(correct, data.streak)
      ;(window as any).__betPrediction = null
    }

    if (this.tournamentConfig.enabled) {
      if (this.winnerId === 'A') this.tournament.scoreA++
      else this.tournament.scoreB++
      this.tournament.round++
      this.callbacks.onTournamentUpdate?.(this.tournament)

      if (this.tournament.scoreA >= this.tournament.roundsToWin || this.tournament.scoreB >= this.tournament.roundsToWin) {
        // Tournament over
      }
    }
  }

  private computeSlomoScale(elapsed: number): number {
    if (elapsed < SLOMO_FADE_IN) return 1 - (1 - SLOMO_TARGET) * (elapsed / SLOMO_FADE_IN)
    if (elapsed < SLOMO_DURATION - SLOMO_FADE_IN) return SLOMO_TARGET
    const t = (elapsed - (SLOMO_DURATION - SLOMO_FADE_IN)) / SLOMO_FADE_IN
    return SLOMO_TARGET + (1 - SLOMO_TARGET) * t
  }

  private updatePowerUpSpawning(delta: number): void {
    this.powerUpTimer -= delta
    if (this.powerUpTimer <= 0 && this.powerUps.length < POWERUP_MAX_ACTIVE) {
      this.spawnPowerUp()
      this.powerUpTimer = POWERUP_SPAWN_INTERVAL + randRange(-2000, 2000)
    }
  }

  private spawnPowerUp(): void {
    const padding = WALL_THICKNESS + 60
    const x = randRange(padding, WALL_THICKNESS + this.arena.width - padding)
    const y = randRange(padding, WALL_THICKNESS + this.arena.height - padding)
    const type: PowerUpType = Math.random() < 0.5 ? 'shield' : 'damageBoost'

    const body = Matter.Bodies.circle(x, y, POWERUP_RADIUS, {
      isSensor: true,
      isStatic: true,
      label: `powerup-${type}`,
      collisionFilter: { category: 0x0008, mask: 0x0002 },
    })

    Matter.Composite.add(this.world, body)
    this.powerUps.push({ type, body, active: true })
  }

  private checkPowerUpPickups(): void {
    // Handled in collision events
  }

  private processRemovals(): void {
    for (const body of this.bodiesToRemove) Matter.Composite.remove(this.world, body)
    this.bodiesToRemove = []
  }

  private cleanupBullets(): void {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      if (isBulletOutOfBounds(this.bullets[i].body, this.arena)) {
        this.bodiesToRemove.push(this.bullets[i].body)
        this.bullets.splice(i, 1)
      }
    }
  }

  private updateFiring(delta: number): void {
    this.nextFireTimer -= delta
    if (this.nextFireTimer <= 0) {
      const aliveGuns: string[] = []
      for (const [id, gun] of this.guns) if (gun.health > 0) aliveGuns.push(id)
      if (aliveGuns.length <= 1) return
      const shooter = this.randomSystem.pickShooter(aliveGuns)
      this.fireGun(shooter)
      const gun = this.guns.get(shooter)
      if (gun) this.nextFireTimer = this.randomSystem.nextFireDelay(gun.model.fireCooldownMin, gun.model.fireCooldownMax)
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
      if (p.life <= 0) this.particles.splice(i, 1)
    }
    if (this.particles.length > MAX_PARTICLES) this.particles.splice(0, this.particles.length - MAX_PARTICLES)
  }

  private updateDamageNumbers(): void {
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const d = this.damageNumbers[i]
      d.y += d.vy
      d.life--
      if (d.life <= 0) this.damageNumbers.splice(i, 1)
    }
  }

  private spawnDamageNumber(x: number, y: number, text: string, color: string, size: number): void {
    if (this.damageNumbers.length >= MAX_DAMAGE_NUMBERS) return
    this.damageNumbers.push({ x, y, text, color, life: DAMAGE_NUMBER_LIFE, maxLife: DAMAGE_NUMBER_LIFE, vy: -1.5, size })
  }

  private updateShake(): void {
    if (this.shakeIntensity > 0) this.shakeIntensity = Math.max(0, this.shakeIntensity - 0.5)
  }

  private updateHitFlashes(): void {
    for (const [id, timer] of this.hitFlashTimers) {
      const n = timer - 1
      if (n <= 0) this.hitFlashTimers.delete(id)
      else this.hitFlashTimers.set(id, n)
    }
  }

  private spawnMuzzleFlash(x: number, y: number): void {
    for (let i = 0; i < 5; i++) {
      if (this.particles.length >= MAX_PARTICLES) break
      this.particles.push({ x, y, vx: 0, vy: 0, life: 4, maxLife: 4, color: COLORS.MUZZLE_FLASH, size: 6 + Math.random() * 4, alpha: 1, type: 'muzzle' })
    }
  }

  private spawnSmoke(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break
      this.particles.push({ x, y, vx: (Math.random() - 0.5) * 0.5, vy: -Math.random() * 0.5 - 0.2, life: 30, maxLife: 30, color: COLORS.SMOKE, size: 3 + Math.random() * 3, alpha: 0.6, type: 'smoke' })
    }
  }

  private spawnHitSparks(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      if (this.particles.length >= MAX_PARTICLES) break
      const a = randRange(0, Math.PI * 2), s = randRange(2, 6)
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 20, maxLife: 20, color: COLORS.SPARK, size: randRange(2, 4), alpha: 1, type: 'spark' })
    }
  }

  private spawnDust(x: number, y: number): void {
    for (let i = 0; i < 4; i++) {
      if (this.particles.length >= MAX_PARTICLES) break
      this.particles.push({ x, y, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, life: 15, maxLife: 15, color: COLORS.DUST, size: 2 + Math.random() * 2, alpha: 0.5, type: 'dust' })
    }
  }

  startNextRound(): void {
    if (this.tournamentConfig.enabled) {
      this.startBattle({
        selections: this.selections,
        arena: this.arena.id,
        settings: this.settings,
        tournament: this.tournamentConfig,
      })
    }
  }

  setSoundEnabled(val: boolean): void {
    this.audioSystem.setEnabled(val)
  }

  reset(): void {
    this.cleanup()
    this.state = 'MENU'
    this.timeScale = 1
    this.callbacks.onStateChange('MENU')
    this.callbacks.onHealthChange(100, 100)
    this.tournament = { scoreA: 0, scoreB: 0, round: 1, roundsToWin: 2 }
  }

  private cleanup(): void {
    for (const b of this.bullets) Matter.Composite.remove(this.world, b.body)
    this.bullets = []
    for (const g of this.guns.values()) Matter.Composite.remove(this.world, g.body)
    this.guns.clear()
    for (const p of this.powerUps) Matter.Composite.remove(this.world, p.body)
    this.powerUps = []
    this.particles = []
    this.damageNumbers = []
    this.bodiesToRemove = []
    this.hitFlashTimers.clear()
    this.shakeIntensity = 0
    this.timeScale = 1
    this.winnerId = ''
  }

  destroy(): void {
    window.removeEventListener('keydown', this.boundKeyHandler)
    cancelAnimationFrame(this.rafId)
    Matter.Engine.clear(this.engine)
  }
}
