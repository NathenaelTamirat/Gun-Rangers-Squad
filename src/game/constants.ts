import { GunModelConfig } from './types'

export const ARENA_WIDTH = 800
export const ARENA_HEIGHT = 600
export const WALL_THICKNESS = 30

export const GUN_HEIGHT = 22
export const GUN_HEALTH = 100
export const GUN_RESTITUTION = 0.4
export const GUN_FRICTION = 0.6
export const GUN_FRICTION_AIR = 0.01
export const GUN_ANGULAR_DAMPING = 0.08

export const BULLET_RADIUS = 3
export const BULLET_MASS = 0.1
export const RECOIL_VARIANCE = 0.15

export const MIN_SPAWN_DISTANCE = 200

export const MAX_BULLETS = 100
export const MAX_PARTICLES = 600

export const SLOMO_DURATION = 2500
export const SLOMO_TARGET = 0.04
export const SLOMO_FADE_IN = 400

export const COLORS = {
  GUN_A: '#4488ff',
  GUN_B: '#ff4444',
  BULLET_A: '#88bbff',
  BULLET_B: '#ff8888',
  WALL: '#2a2a3e',
  WALL_BORDER: '#555577',
  ARENA_BG: '#1a1a2e',
  MUZZLE_FLASH: '#ffffaa',
  SPARK: '#ffaa44',
  SMOKE: '#888888',
  DUST: '#aaaaaa',
  HEALTH_BAR_BG: '#333333',
  HEALTH_BAR: '#44cc44',
  HEALTH_BAR_LOW: '#ff4444',
  TEXT: '#ffffff',
}

export const GUN_MODELS: Record<string, GunModelConfig> = {
  pistol: {
    name: 'Pistol',
    damage: 10,
    fireCooldownMin: 300,
    fireCooldownMax: 700,
    recoilForce: 0.04,
    bulletSpeed: 14,
    bulletSpread: 0.03,
    bulletsPerShot: 1,
    length: 50,
    mass: 2.5,
    color: '#4488ff',
    bulletColor: '#88bbff',
  },
  rifle: {
    name: 'Rifle',
    damage: 18,
    fireCooldownMin: 500,
    fireCooldownMax: 1100,
    recoilForce: 0.08,
    bulletSpeed: 22,
    bulletSpread: 0.01,
    bulletsPerShot: 1,
    length: 72,
    mass: 4,
    color: '#44dd88',
    bulletColor: '#88ffbb',
  },
  shotgun: {
    name: 'Shotgun',
    damage: 6,
    fireCooldownMin: 800,
    fireCooldownMax: 1500,
    recoilForce: 0.14,
    bulletSpeed: 10,
    bulletSpread: 0.18,
    bulletsPerShot: 5,
    length: 60,
    mass: 3.5,
    color: '#ff8844',
    bulletColor: '#ffbb88',
  },
}

export const GUN_COLORS_BY_ID: Record<string, string> = {
  A: '#4488ff',
  B: '#ff4444',
}
