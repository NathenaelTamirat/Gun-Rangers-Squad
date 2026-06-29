export type GameState = 'MENU' | 'SPAWN' | 'BATTLE' | 'SLOMO' | 'VICTORY'

export interface GunModelConfig {
  name: string
  damage: number
  fireCooldownMin: number
  fireCooldownMax: number
  recoilForce: number
  bulletSpeed: number
  bulletSpread: number
  bulletsPerShot: number
  length: number
  mass: number
  color: string
  bulletColor: string
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
}

export interface BulletData {
  ownerId: string
  body: Matter.Body
  damage: number
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
  type: 'spark' | 'smoke' | 'dust' | 'muzzle'
}

export interface GunSelections {
  gunA: string
  gunB: string
}

export interface GameCallbacks {
  onHealthChange: (gunA: number, gunB: number) => void
  onWinner: (gunId: string) => void
  onStateChange: (state: GameState) => void
  onSlomo?: () => void
}
