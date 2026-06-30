export type GameState = 'MENU' | 'SPAWN' | 'BATTLE' | 'SLOMO' | 'VICTORY' | 'PAUSED'

export interface GunModelConfig {
  name: string
  summary: string
  damage: number
  fireCooldownMin: number
  fireCooldownMax: number
  recoilForce: number
  recoilAngularKick: number
  bulletSpeed: number
  bulletSpread: number
  bulletsPerShot: number
  length: number
  mass: number
  color: string
  bulletColor: string
  stability: number
  recoverySpeed: number
  spreadGrowth: number
  frictionAir: number
  restitution: number
  customInertia?: number
}

export interface GunData {
  id: string
  label: string
  modelName: string
  color: string
  bulletColor: string
  health: number
  maxHealth: number
  model: GunModelConfig
  body: Matter.Body
  powerUps: GunPowerUpState
}

export interface GunPowerUpState {
  shield: boolean
  damageBoost: boolean
}

export interface BulletData {
  ownerId: string
  body: Matter.Body
  damage: number
  critical: boolean
  prevX: number
  prevY: number
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
  alpha: number
  type: 'spark' | 'smoke' | 'dust' | 'muzzle' | 'casing'
  rotation?: number
  rotationSpeed?: number
}

export interface DamageNumber {
  x: number
  y: number
  text: string
  color: string
  life: number
  maxLife: number
  vy: number
  size: number
}

export type PowerUpType = 'shield' | 'damageBoost'

export interface PowerUpSpawn {
  type: PowerUpType
  body: Matter.Body
  active: boolean
}

export interface GunSelections {
  gunA: string
  gunB: string
}

export type BotDifficultyId = 'wild' | 'steady' | 'deadeye'

export interface BotProfile {
  id: BotDifficultyId
  label: string
  aimTolerance: number
  triggerPatience: number
  mistakeChance: number
  stabilizingTorque: number
}

export interface ArenaConfig {
  id: string
  name: string
  width: number
  height: number
  label: string
}

export interface RoundStats {
  shotsFired: number
  hitsLanded: number
  damageDealt: number
  wallBounces: number
  criticals: number
}

export interface BattleStats {
  gunA: RoundStats
  gunB: RoundStats
  winnerId: string
}

export interface PhysicsSettings {
  gravityX: number
  gravityY: number
  recoilMultiplier: number
  restitutionMultiplier: number
  bulletSpeedMultiplier: number
}

export interface TournamentConfig {
  enabled: boolean
  bestOf: number
}

export interface TournamentState {
  scoreA: number
  scoreB: number
  round: number
  roundsToWin: number
}

export interface GameCallbacks {
  onHealthChange: (gunA: number, gunB: number) => void
  onWinner: (gunId: string) => void
  onStateChange: (state: GameState) => void
  onBotProfile?: (profile: BotProfile) => void
  onStatsUpdate?: (stats: BattleStats) => void
  onBetResult?: (correct: boolean, streak: number) => void
  onTournamentUpdate?: (state: TournamentState) => void
}
