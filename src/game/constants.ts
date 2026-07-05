import { GunModelConfig } from './types'

export const WALL_THICKNESS = 45

export const GUN_HEIGHT = 22
export const GUN_HEALTH = 100
export const GUN_RESTITUTION = 0.88   // wall restitution — snappy bounce
export const GUN_FRICTION = 0.1       // low wall friction so guns slide on bounce
export const GUN_ANGULAR_DAMPING = 0.010  // soft — lets spin last longer

export const MAX_RECOIL_SPEED_DELTA = 12   // px/frame a single shot can add
export const MAX_GUN_TOTAL_SPEED = 30      // absolute cap right after firing
export const MAX_GUN_LINEAR_SPEED = 36     // absolute cap, enforced every frame
export const MAX_GUN_ANGULAR_SPEED = 2.0   // rad/frame, enforced every frame
export const MAX_RECOIL_ANGULAR_KICK = 0.40 // rad/frame added per shot

// Fibonacci stacking-damper tuning (Rule 2: consecutive recoil events before
// a gun fully recovers get damped by 1/fib(n)^2 instead of stacking linearly)
export const RECOIL_STABLE_EPSILON = 0.01   // kick below this = "fully recovered", resets n to 1
export const RECOIL_FIB_CAP_INDEX = 10      // caps n so fib() never grows unbounded (fib(10)=55, damping≈1/3025)

export const BULLET_RADIUS = 3
export const BULLET_MASS = 0.1
export const RECOIL_VARIANCE = 0.15

export const MIN_SPAWN_DISTANCE = 200

export const MAX_BULLETS = 100
export const MAX_PARTICLES = 800
export const MAX_DAMAGE_NUMBERS = 30

export const CRITICAL_CHANCE = 0.1
export const CRITICAL_MULTIPLIER = 2

export const POWERUP_SPAWN_INTERVAL = 6000
export const POWERUP_RADIUS = 10
export const POWERUP_SHIELD_DURATION = 8000
export const POWERUP_DAMAGE_DURATION = 8000
export const POWERUP_MAX_ACTIVE = 3

export const DAMAGE_NUMBER_LIFE = 35

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
  CRITICAL: '#ff44ff',
  POWERUP_SHIELD: '#44ddff',
  POWERUP_DAMAGE: '#ff8844',
  WALL_IMPACT: '#ffcc66',
}

export const GUN_MODELS: Record<string, GunModelConfig> = {
  pistol: {
    name: 'Pistol',
    summary: 'Balanced recoil, quick follow-up shots, forgiving handling.',
    damage: 10,
    fireCooldownMin: 300,
    fireCooldownMax: 700,
    recoilForce: 0.0048,       // stronger — clearly felt
    recoilAngularKick: 0.15,
    bulletSpeed: 14,
    bulletSpread: 0.03,
    bulletsPerShot: 1,
    length: 50,
    mass: 2.5,
    color: '#4488ff',
    bulletColor: '#88bbff',
    stability: 0.5,
    recoverySpeed: 0.92,
    spreadGrowth: 0.015,
    frictionAir: 0.0025,        // low air friction — gun slides naturally
    restitution: 0.82,
  },
  rifle: {
    name: 'Rifle',
    summary: 'Fast and accurate, with strong kick and slower shots.',
    damage: 18,
    fireCooldownMin: 500,
    fireCooldownMax: 1100,
    recoilForce: 0.007,        // heavy kick
    recoilAngularKick: 0.12,
    bulletSpeed: 22,
    bulletSpread: 0.01,
    bulletsPerShot: 1,
    length: 72,
    mass: 4,
    color: '#44dd88',
    bulletColor: '#88ffbb',
    stability: 0.7,
    recoverySpeed: 0.95,
    spreadGrowth: 0.008,
    frictionAir: 0.0015,
    restitution: 0.78,
    customInertia: 2600,
  },
  shotgun: {
    name: 'Shotgun',
    summary: 'Wide pellet cone and brutal recoil — launches the gun backward.',
    damage: 6,
    fireCooldownMin: 800,
    fireCooldownMax: 1500,
    recoilForce: 0.014,        // violent backward launch
    recoilAngularKick: 0.30,
    bulletSpeed: 10,
    bulletSpread: 0.18,
    bulletsPerShot: 5,
    length: 60,
    mass: 3.5,
    color: '#ff8844',
    bulletColor: '#ffbb88',
    stability: 0.2,
    recoverySpeed: 0.85,
    spreadGrowth: 0.04,
    frictionAir: 0.003,
    restitution: 0.72,
  },
  sniper: {
    name: 'Sniper',
    summary: 'One-shot power with extreme recoil that slams the gun backward.',
    damage: 35,
    fireCooldownMin: 1200,
    fireCooldownMax: 2000,
    recoilForce: 0.022,        // extreme — gun flies backward on shot
    recoilAngularKick: 0.10,
    bulletSpeed: 30,
    bulletSpread: 0.005,
    bulletsPerShot: 1,
    length: 80,
    mass: 5,
    color: '#bb44ff',
    bulletColor: '#dd88ff',
    stability: 0.85,
    recoverySpeed: 0.98,
    spreadGrowth: 0.004,
    frictionAir: 0.0008,
    restitution: 0.68,
    customInertia: 3500,
  },
}