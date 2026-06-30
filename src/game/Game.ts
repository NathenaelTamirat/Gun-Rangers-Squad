import Matter from 'matter-js'
import {
  GameState, GunData, BulletData, Particle, DamageNumber,
  PowerUpSpawn, PowerUpType, GameCallbacks,
  GunSelections, ArenaConfig, PhysicsSettings, BattleStats,
  TournamentState, TournamentConfig, BotProfile, GunModelConfig,
} from './types'
import {
  WALL_THICKNESS, MAX_BULLETS, MAX_PARTICLES, MAX_DAMAGE_NUMBERS,
  GUN_MODELS, COLORS,
  SLOMO_DURATION, SLOMO_TARGET, SLOMO_FADE_IN,
  GUN_RESTITUTION, GUN_FRICTION,
  CRITICAL_CHANCE, CRITICAL_MULTIPLIER,
  POWERUP_SPAWN_INTERVAL, POWERUP_RADIUS,
  POWERUP_SHIELD_DURATION, POWERUP_DAMAGE_DURATION, POWERUP_MAX_ACTIVE,
  DAMAGE_NUMBER_LIFE, GUN_HEALTH, GUN_HEIGHT,
} from './constants'
import { ARENAS, DEFAULT_SETTINGS } from './arenas'
import { RandomSystem } from './systems/RandomSystem'
import { SpawnSystem } from './systems/SpawnSystem'
import { AudioSystem } from './systems/AudioSystem'
import { RenderSystem } from './systems/RenderSystem'
import { StatsSystem } from './systems/StatsSystem'
import { shoot } from './physics/shooting'
import {
  RecoilState, createRecoilState,
  applyRecoilPhysics, applyRecoilPlayer, decayPlayerRecoil,
  decayAIRecoil, getDynamicSpread,
  gaussianRandom,
} from './physics/recoil'
import {
  isBulletCollision, isGunCollision, getBodyOwnerId,
  isBulletOutOfBounds, getGunIdFromBody,
} from './physics/collisions'
import { getBarrelTip } from './entities/Gun'
import { randRange } from '../utils/math'
import { saveBattle } from './database'

const BOT_PROFILES: BotProfile[] = [
  {
    id: 'wild',
    label: 'Wild Bot',
    aimTolerance: 0.62,
    triggerPatience: 0.2,
    mistakeChance: 0.3,
    stabilizingTorque: 0.0000015,
  },
  {
    id: 'steady',
    label: 'Steady Bot',
    aimTolerance: 0.42,
    triggerPatience: 0.52,
    mistakeChance: 0.13,
    stabilizingTorque: 0.0000025,
  },
  {
    id: 'deadeye',
    label: 'Deadeye Bot',
    aimTolerance: 0.24,
    triggerPatience: 0.78,
    mistakeChance: 0.05,
    stabilizingTorque: 0.0000035,
  },
]

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
  private boundPointerDown: (e: PointerEvent) => void
  private playerFireTimer = 0
  private recoilState: RecoilState = createRecoilState()
  private aiRecoilState: RecoilState = createRecoilState()
  private botProfile: BotProfile = BOT_PROFILES[1]
  private botDifficultyLevel: number = 3
  // Tracks the frame index when a gun last bounced off a wall via physics collision.
  // Used so keepGunInsideArena does NOT also invert velocity that same frame.
  private lastWallBounceFrame: Map<string, number> = new Map()
  private frameIndex: number = 0
  // Adjust bot difficulty (1-5) by scaling profile parameters and storing level
  public setBotDifficulty(level: number): void {
    const clamped = Math.max(1, Math.min(5, level))
    this.botDifficultyLevel = clamped
    const base = this.botProfile
    const aimTolerance = 0.62 - ((clamped - 1) / 4) * (0.62 - 0.24)
    const triggerPatience = 0.2 + ((clamped - 1) / 4) * (0.78 - 0.2)
    const mistakeChance = 0.3 - ((clamped - 1) / 4) * (0.3 - 0.05)
    this.botProfile = { ...base, aimTolerance, triggerPatience, mistakeChance }
  }
  private lastHealthUpdateTime: number = 0
  private readonly HEALTH_UPDATE_INTERVAL = 100

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
    this.boundPointerDown = this.handlePointerDown.bind(this)
    window.addEventListener('keydown', this.boundKeyHandler)
    this.canvas.addEventListener('pointerdown', this.boundPointerDown)

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

  private handlePointerDown(e: PointerEvent): void {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.preventDefault()
    if (this.state === 'BATTLE') {
      this.tryPlayerFire()
    }
  }

  private tryPlayerFire(): void {
    if (this.playerFireTimer > 0) return
    this.fireGun('A')
    const gun = this.guns.get('A')
    if (gun) this.playerFireTimer = gun.model.fireCooldownMin
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
    else if (isGunA && bodyB.label === 'wall') this.handleGunWallCollision(bodyA, bodyB)
    else if (isGunB && bodyA.label === 'wall') this.handleGunWallCollision(bodyB, bodyA)
    else if (isGunA && isGunB) this.handleGunGunCollision(bodyA, bodyB)
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

    this.bodiesToRemove.push(bullet.body)
    this.bullets.splice(bulletIdx, 1)

    if (targetGun.health <= 0) {
      const hpA = this.guns.get('A')?.health ?? 0
      const hpB = this.guns.get('B')?.health ?? 0
      this.callbacks.onHealthChange(hpA, hpB)
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

    const modelA = this.resolveGunModel(this.selections.gunA, GUN_MODELS.pistol)
    const modelB = this.resolveGunModel(this.selections.gunB, GUN_MODELS.pistol)
    const { gunA, gunB } = this.spawnSystem.spawnGuns(this.world, modelA, modelB, this.arena, this.callbacks)
    this.guns.set('A', gunA)
    this.guns.set('B', gunB)

    this.state = 'BATTLE'
    this.nextFireTimer = 1500
    this.playerFireTimer = 0
    this.recoilState = createRecoilState()
    this.aiRecoilState = createRecoilState()
    this.botProfile = this.createBotProfile()
    // Apply stored difficulty level to the newly created bot profile
    this.setBotDifficulty(this.botDifficultyLevel)
    this.callbacks.onBotProfile?.(this.botProfile)
    this.timeScale = 1
    this.lastTimestamp = performance.now()
    this.callbacks.onStateChange('BATTLE')

    this.powerUpTimer = POWERUP_SPAWN_INTERVAL
  }

  private resolveGunModel(selection: string, fallback: GunModelConfig): GunModelConfig {
    if (selection !== 'random') return GUN_MODELS[selection] ?? fallback
    const keys = Object.keys(GUN_MODELS)
    return GUN_MODELS[keys[Math.floor(Math.random() * keys.length)]] ?? fallback
  }

  private createBotProfile(): BotProfile {
    const base = BOT_PROFILES[Math.floor(Math.random() * BOT_PROFILES.length)] ?? BOT_PROFILES[1]
    return {
      ...base,
      aimTolerance: Math.max(0.16, gaussianRandom(base.aimTolerance, 0.04)),
      triggerPatience: Math.max(0.05, Math.min(0.95, gaussianRandom(base.triggerPatience, 0.08))),
      mistakeChance: Math.max(0.01, Math.min(0.5, gaussianRandom(base.mistakeChance, 0.04))),
    }
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

    let dynamicSpread: number | undefined
    if (gunId === 'A') {
      dynamicSpread = getDynamicSpread(model, this.recoilState.accumulatedSpread, Math.abs(gun.body.velocity.x) + Math.abs(gun.body.velocity.y))
    } else {
      dynamicSpread = getDynamicSpread(model, this.aiRecoilState.accumulatedSpread, Math.abs(gun.body.velocity.x) + Math.abs(gun.body.velocity.y))
    }

    const adjustedModel = {
      ...model,
      bulletSpeed: model.bulletSpeed * speedMul,
      recoilForce: model.recoilForce * recoilMul,
      damage: finalDamage,
    }

    const bulletDataList = shoot(gun.body, gunId, this.world, adjustedModel, dynamicSpread)
    for (const bd of bulletDataList) {
      bd.critical = crit
      if (this.bullets.length >= MAX_BULLETS) {
        const oldest = this.bullets.shift()
        if (oldest) Matter.Composite.remove(this.world, oldest.body)
      }
      this.bullets.push(bd)
    }

    if (gunId === 'A') {
      applyRecoilPhysics(gun.body, model, this.settings.recoilMultiplier)
      applyRecoilPlayer(this.recoilState, model, this.settings.recoilMultiplier, performance.now())
    } else {
      applyRecoilPhysics(gun.body, model, this.settings.recoilMultiplier)
      applyRecoilPlayer(this.aiRecoilState, model, this.settings.recoilMultiplier, performance.now())
    }

    this.statsSystem.recordShot(gunId)
    if (crit) this.statsSystem.recordCritical(gunId)

    const tip = getBarrelTip(gun.body, model.length)
    const shakeMag = model.recoilForce * 60
    this.shakeIntensity = Math.min(this.shakeIntensity + shakeMag * (crit ? 2 : 1), 20)

    this.spawnMuzzleFlash(tip.x, tip.y)
    this.spawnSmoke(tip.x, tip.y, 2)
    this.spawnCasing(tip.x, tip.y, gun.body.angle)
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
    this.frameIndex++

    if (this.state === 'BATTLE') {
      Matter.Engine.update(this.engine, rawDelta)
      decayPlayerRecoil(this.recoilState, rawDelta)
      decayAIRecoil(this.aiRecoilState, rawDelta)
      for (const [id, gun] of this.guns) {
        if (gun.health > 0) {
          // Soft angular damping — lets spin from recoil persist naturally
          Matter.Body.setAngularVelocity(gun.body, gun.body.angularVelocity * 0.975)
          if (id === 'B') this.applyBotStabilizer(gun)
          this.keepGunInsideArena(gun)
        }
      }
      this.processRemovals()
      this.cleanupBullets()
      this.updateAIFiring(rawDelta)
      this.updatePlayerFiring(rawDelta)
      this.updatePowerUpSpawning(rawDelta)
      this.checkPowerUpPickups()

      this.lastHealthUpdateTime += rawDelta
      if (this.lastHealthUpdateTime >= this.HEALTH_UPDATE_INTERVAL) {
        this.lastHealthUpdateTime = 0
        const hpA = this.guns.get('A')?.health ?? 0
        const hpB = this.guns.get('B')?.health ?? 0
        this.callbacks.onHealthChange(hpA, hpB)
      }
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

  private applyBotStabilizer(gun: GunData): void {
    const target = this.guns.get('A')
    if (!target || target.health <= 0) return

    const desiredAngle = Math.atan2(
      target.body.position.y - gun.body.position.y,
      target.body.position.x - gun.body.position.x,
    )
    const diff = this.shortestAngle(desiredAngle - gun.body.angle)
    const stability = gun.model.stability * this.botProfile.stabilizingTorque
    const sideX = -Math.sin(gun.body.angle) * GUN_HEIGHT * 0.5
    const sideY = Math.cos(gun.body.angle) * GUN_HEIGHT * 0.5
    Matter.Body.applyForce(gun.body, {
      x: gun.body.position.x + sideX,
      y: gun.body.position.y + sideY,
    }, {
      x: Math.cos(gun.body.angle) * Math.sign(diff) * stability,
      y: Math.sin(gun.body.angle) * Math.sign(diff) * stability,
    })
  }

  private keepGunInsideArena(gun: GunData): void {
    // Cap speed to prevent physics instability (but allow higher values for recoil feel)
    const speed = Math.hypot(gun.body.velocity.x, gun.body.velocity.y)
    const maxSpeed = 35
    if (speed > maxSpeed) {
      const scale = maxSpeed / speed
      Matter.Body.setVelocity(gun.body, {
        x: gun.body.velocity.x * scale,
        y: gun.body.velocity.y * scale,
      })
    }

    const maxAngular = 1.2
    if (Math.abs(gun.body.angularVelocity) > maxAngular) {
      Matter.Body.setAngularVelocity(gun.body, Math.sign(gun.body.angularVelocity) * maxAngular)
    }

    const margin = Math.max(gun.model.length, GUN_HEIGHT) / 2 + 3
    const minX = WALL_THICKNESS + margin
    const maxX = WALL_THICKNESS + this.arena.width - margin
    const minY = WALL_THICKNESS + margin
    const maxY = WALL_THICKNESS + this.arena.height - margin
    const { x, y } = gun.body.position
    const clampedX = Math.max(minX, Math.min(maxX, x))
    const clampedY = Math.max(minY, Math.min(maxY, y))

    if (clampedX !== x || clampedY !== y) {
      // Position-correct only. If a physics collision bounce already ran this frame,
      // don't invert velocity again (would fight the bounce).
      Matter.Body.setPosition(gun.body, { x: clampedX, y: clampedY })
      const lastBounce = this.lastWallBounceFrame.get(gun.id) ?? -999
      if (this.frameIndex - lastBounce > 2) {
        // Fallback soft bounce — only if physics collision didn't already handle it
        Matter.Body.setVelocity(gun.body, {
          x: clampedX !== x ? -gun.body.velocity.x * 0.5 : gun.body.velocity.x,
          y: clampedY !== y ? -gun.body.velocity.y * 0.5 : gun.body.velocity.y,
        })
      }
    }
  }

  /**
   * Gun hits a wall: reflect the velocity on the correct axis (determined by which wall was hit),
   * add spin, impact sparks, and a screen shake.
   * This is the ONLY place velocity is reflected — keepGunInsideArena will skip its own reflection.
   */
  private handleGunWallCollision(gunBody: Matter.Body, wallBody: Matter.Body): void {
    const gunId = getGunIdFromBody(gunBody)
    const gun = this.guns.get(gunId)
    if (!gun) return

    // Record this frame so keepGunInsideArena doesn't double-bounce
    this.lastWallBounceFrame.set(gun.id, this.frameIndex)

    const restitution = 0.78 * this.settings.restitutionMultiplier
    const vel = gunBody.velocity
    const pos = gunBody.position
    const aw = this.arena.width, ah = this.arena.height

    // Determine which wall was hit by finding the gun's nearest wall axis
    const distLeft   = pos.x - WALL_THICKNESS
    const distRight  = WALL_THICKNESS + aw - pos.x
    const distTop    = pos.y - WALL_THICKNESS
    const distBottom = WALL_THICKNESS + ah - pos.y
    const minDist = Math.min(distLeft, distRight, distTop, distBottom)

    let newVx = vel.x
    let newVy = vel.y

    if (minDist === distLeft || minDist === distRight) {
      // Hit left or right wall — invert X velocity
      newVx = -vel.x * restitution
    } else {
      // Hit top or bottom wall — invert Y velocity
      newVy = -vel.y * restitution
    }

    Matter.Body.setVelocity(gunBody, { x: newVx, y: newVy })

    // Small spin on impact for natural feel
    const spinKick = (Math.random() - 0.5) * 0.3
    Matter.Body.setAngularVelocity(gunBody, gunBody.angularVelocity * 0.6 + spinKick)

    // Visual: wall-impact sparks and shake
    const impactX = Math.min(WALL_THICKNESS + aw, Math.max(WALL_THICKNESS, pos.x))
    const impactY = Math.min(WALL_THICKNESS + ah, Math.max(WALL_THICKNESS, pos.y))
    this.spawnWallImpactSparks(impactX, impactY)
    this.shakeIntensity = Math.min(this.shakeIntensity + 4, 14)
  }

  /** Billiard-style collision between two guns: exchange momentum + sparks + shake */
  private handleGunGunCollision(bodyA: Matter.Body, bodyB: Matter.Body): void {
    const speed = Math.hypot(bodyA.velocity.x - bodyB.velocity.x, bodyA.velocity.y - bodyB.velocity.y)
    if (speed < 1) return // ignore micro-collisions

    // Spawn impact sparks at midpoint
    const mx = (bodyA.position.x + bodyB.position.x) / 2
    const my = (bodyA.position.y + bodyB.position.y) / 2
    this.spawnHitSparks(mx, my)
    this.shakeIntensity = Math.min(this.shakeIntensity + 5, 18)
  }

  private endBattle(): void {
    this.state = 'VICTORY'
    this.timeScale = 1
    this.audioSystem.playVictory()
    this.callbacks.onStateChange('VICTORY')

    const stats = this.statsSystem.getStats(this.winnerId)
    this.callbacks.onStatsUpdate?.(stats)

    saveBattle({
      date: new Date().toISOString(),
      gunA: this.guns.get('A')?.model.name ?? this.selections.gunA,
      gunB: this.guns.get('B')?.model.name ?? this.selections.gunB,
      arena: this.arena.id,
      winner: this.winnerId,
      shotsFired: stats.gunA.shotsFired + stats.gunB.shotsFired,
      hitsLanded: stats.gunA.hitsLanded + stats.gunB.hitsLanded,
      damageDealt: stats.gunA.damageDealt + stats.gunB.damageDealt,
      criticals: stats.gunA.criticals + stats.gunB.criticals,
      playerWon: this.winnerId === 'A',
    }).catch(() => {})

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

  private updateAIFiring(delta: number): void {
    const gunB = this.guns.get('B')
    const gunA = this.guns.get('A')
    if (!gunB || gunB.health <= 0 || !gunA) return

    const dx = gunA.body.position.x - gunB.body.position.x
    const dy = gunA.body.position.y - gunB.body.position.y
    const targetAngle = Math.atan2(dy, dx)
    const diff = Math.abs(this.shortestAngle(targetAngle - gunB.body.angle))
    const tolerance = this.botProfile.aimTolerance * (1 - gunB.model.stability * 0.25)
    const aimScore = Math.max(0, 1 - diff / Math.PI)
    const stableEnough = this.aiRecoilState.kick < 0.55 && Math.abs(gunB.body.angularVelocity) < 0.24
    const impatientShot = Math.random() < this.botProfile.mistakeChance * (delta / 1000)
    const confidentShot = diff < tolerance && stableEnough && Math.random() < this.botProfile.triggerPatience

    this.nextFireTimer -= delta
    if (this.nextFireTimer <= 0 && (confidentShot || impatientShot || aimScore > 0.96)) {
      this.fireGun('B')
      this.nextFireTimer = this.randomSystem.nextFireDelay(gunB.model.fireCooldownMin, gunB.model.fireCooldownMax)
    }
  }

  private shortestAngle(angle: number): number {
    let result = angle
    while (result > Math.PI) result -= Math.PI * 2
    while (result < -Math.PI) result += Math.PI * 2
    return result
  }

  private updatePlayerFiring(delta: number): void {
    if (this.playerFireTimer > 0) {
      this.playerFireTimer -= delta
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
    // Slower decay for a satisfying rumble
    this.shakeIntensity *= 0.88
    if (this.shakeIntensity < 0.05) this.shakeIntensity = 0
  }

  private updateHitFlashes(): void {
    for (const [id, timer] of this.hitFlashTimers) {
      const n = timer - 1
      if (n <= 0) this.hitFlashTimers.delete(id)
      else this.hitFlashTimers.set(id, n)
    }
  }

  private spawnMuzzleFlash(x: number, y: number): void {
    // Large bright burst
    for (let i = 0; i < 8; i++) {
      if (this.particles.length >= MAX_PARTICLES) break
      const a = Math.random() * Math.PI * 2
      const s = Math.random() * 2.5
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 9, maxLife: 9, color: COLORS.MUZZLE_FLASH, size: 14 + Math.random() * 10, alpha: 1, type: 'muzzle' })
    }
    // Tight sparks radiating outward
    for (let i = 0; i < 6; i++) {
      if (this.particles.length >= MAX_PARTICLES) break
      const a = Math.random() * Math.PI * 2
      const s = 3 + Math.random() * 4
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 7, maxLife: 7, color: '#ffffff', size: 3, alpha: 1, type: 'spark' })
    }
  }

  private spawnWallImpactSparks(x: number, y: number): void {
    for (let i = 0; i < 10; i++) {
      if (this.particles.length >= MAX_PARTICLES) break
      const a = Math.random() * Math.PI * 2
      const s = 2 + Math.random() * 5
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 18, maxLife: 18, color: COLORS.WALL_IMPACT, size: 2 + Math.random() * 3, alpha: 1, type: 'spark' })
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

  private spawnCasing(x: number, y: number, angle: number): void {
    for (let i = 0; i < 1; i++) {
      if (this.particles.length >= MAX_PARTICLES) break
      const perpAngle = angle + Math.PI / 2 + randRange(-0.3, 0.3)
      this.particles.push({
        x, y,
        vx: Math.cos(perpAngle) * randRange(2, 5) - Math.cos(angle) * 2,
        vy: Math.sin(perpAngle) * randRange(2, 5) - Math.sin(angle) * 2,
        life: 40, maxLife: 40, color: '#ccaa44', size: 3, alpha: 1,
        type: 'casing',
        rotation: angle, rotationSpeed: randRange(-0.3, 0.3),
      })
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
    this.playerFireTimer = 0
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
    this.lastWallBounceFrame.clear()
    this.shakeIntensity = 0
    this.timeScale = 1
    this.winnerId = ''
  }

  destroy(): void {
    window.removeEventListener('keydown', this.boundKeyHandler)
    this.canvas.removeEventListener('pointerdown', this.boundPointerDown)
    cancelAnimationFrame(this.rafId)
    Matter.Engine.clear(this.engine)
  }
}
