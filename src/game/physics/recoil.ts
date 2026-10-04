import Matter from 'matter-js'
import { GunModelConfig } from '../types'
import {
  MAX_GUN_TOTAL_SPEED,
  MAX_RECOIL_ANGULAR_KICK,
  RECOIL_STABLE_EPSILON,
  RECOIL_FIB_CAP_INDEX,
  GUN_HEIGHT,
} from '../constants'

export function gaussianRandom(mean: number, stdDev: number): number {
  const u1 = Math.random(), u2 = Math.random()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return mean + z * stdDev
}

// Mild stacking damper — only kicks in after 3+ rapid consecutive shots.
// fib(1)=1 fib(2)=1 fib(3)=2 → factor 0.25 only on 3rd+ rapid shot.
// We cap at index 4 so it never goes below 1/9 — guns always feel alive.
const fibCache: number[] = [1, 1]
export function fibonacci(n: number): number {
  const clamped = Math.min(Math.max(1, Math.floor(n)), RECOIL_FIB_CAP_INDEX)
  const idx = clamped - 1
  while (fibCache.length <= idx) {
    fibCache.push(fibCache[fibCache.length - 1] + fibCache[fibCache.length - 2])
  }
  return fibCache[idx]
}

export function fibDampingFactor(n: number): number {
  // Cap at index 3 so max damping is 1/fib(3)^2 = 1/4 = 0.25
  // This means even rapid fire never feels completely dead
  const capped = Math.min(n, 3)
  const f = fibonacci(capped)
  return 1 / (f * f)
}

export interface RecoilState {
  kick: number
  rotation: number
  recoveryVelocity: number
  accumulatedSpread: number
  lastShotTime: number
  stackCount: number
  lastEventTime: number
}

export function createRecoilState(): RecoilState {
  return {
    kick: 0,
    rotation: 0,
    recoveryVelocity: 0,
    accumulatedSpread: 0,
    lastShotTime: 0,
    stackCount: 0,
    lastEventTime: 0,
  }
}

export function isFullyRecovered(state: RecoilState): boolean {
  return state.kick < RECOIL_STABLE_EPSILON
}

function advanceStack(state: RecoilState, now: number): number {
  if (isFullyRecovered(state)) {
    state.stackCount = 1
  } else {
    state.stackCount += 1
  }
  state.lastEventTime = now
  return state.stackCount
}

// ---------------------------------------------------------------------------
// SHOOTING RECOIL
// Think: a real gun with a remote trigger bolted to it.
// The propellant fires, the bullet exits the barrel at high velocity.
// Newton's 3rd law: equal and opposite impulse slams the gun backward
// along the barrel axis — hard, immediate, no delay.
// The barrel sits above the center of mass, so the impulse also creates
// a torque that rotates the muzzle upward (or downward depending on
// which side the barrel is on). This is muzzle flip — always the same
// direction for a given gun orientation, never random.
// ---------------------------------------------------------------------------
export function applyRecoilPhysics(
  gunBody: Matter.Body,
  model: GunModelConfig,
  recoilMul: number,
  recoilState: RecoilState,
  now: number,
): void {
  const angle = gunBody.angle
  const n = advanceStack(recoilState, now)
  const damping = fibDampingFactor(n)

  // Linear impulse: straight back along barrel axis.
  // Scale 18000 gives pistol ~14 px/frame, sniper ~50 px/frame on first shot.
  // Heavier guns resist more (divide by mass). Stability reduces by up to 40%.
  const stabilityMul = Math.max(0.6, 1 - model.stability * 0.4)
  const deltaV = (model.recoilForce * recoilMul * stabilityMul * 18000 / model.mass) * damping

  const newVx = gunBody.velocity.x - Math.cos(angle) * deltaV
  const newVy = gunBody.velocity.y - Math.sin(angle) * deltaV

  const spd = Math.hypot(newVx, newVy)
  if (spd > MAX_GUN_TOTAL_SPEED) {
    const s = MAX_GUN_TOTAL_SPEED / spd
    Matter.Body.setVelocity(gunBody, { x: newVx * s, y: newVy * s })
  } else {
    Matter.Body.setVelocity(gunBody, { x: newVx, y: newVy })
  }

  // Angular kick: barrel is above CoM (barrelOffsetY < 0 in local space).
  // Cross product of barrel-offset-vector × recoil-force-vector gives torque sign.
  // This is always deterministic — same gun angle always spins the same way.
  const halfLen = model.length / 2
  const barrelOffsetY = -GUN_HEIGHT * 0.18   // barrel above CoM
  const rfx = -Math.cos(angle)               // recoil direction
  const rfy = -Math.sin(angle)
  // Barrel tip world offset
  const box = Math.cos(angle) * halfLen - Math.sin(angle) * barrelOffsetY
  const boy = Math.sin(angle) * halfLen + Math.cos(angle) * barrelOffsetY
  // 2D cross product → torque sign
  const torqueSign = (box * rfy - boy * rfx) > 0 ? 1 : -1
  // Angular kick magnitude — strong enough to visibly rotate the gun
  const angularDeltaV = model.recoilAngularKick * recoilMul * damping * torqueSign * 3.5
  const clampedSpin = Math.max(-MAX_RECOIL_ANGULAR_KICK, Math.min(MAX_RECOIL_ANGULAR_KICK, angularDeltaV))
  Matter.Body.setAngularVelocity(gunBody, gunBody.angularVelocity + clampedSpin)
}

export function applyRecoilPlayer(
  state: RecoilState,
  model: GunModelConfig,
  recoilMul: number,
  now: number,
): void {
  const timeSinceLastShot = now - state.lastShotTime
  const accumulationDecay = Math.exp(-timeSinceLastShot / 400)
  state.accumulatedSpread = Math.min(1, state.accumulatedSpread * accumulationDecay + 0.2)

  const n = state.stackCount || 1
  const damping = fibDampingFactor(n)

  const stabilityMul = Math.max(0.6, 1 - model.stability * 0.4)
  const baseKick = model.recoilForce * recoilMul * stabilityMul * 20 * damping
  const kickAmount = gaussianRandom(baseKick, baseKick * 0.15) * (1 + state.accumulatedSpread * 0.3)

  state.kick = Math.min(state.kick + kickAmount, 0.8)
  state.recoveryVelocity = state.kick * 0.06
  state.rotation = gaussianRandom(0, model.recoilAngularKick * recoilMul * 30 * damping)
  state.lastShotTime = now
}

export function decayPlayerRecoil(state: RecoilState, delta: number): void {
  const t = delta / 16.67
  if (state.kick > 0) {
    state.kick -= state.recoveryVelocity * t
    if (state.kick < 0) state.kick = 0
    state.recoveryVelocity *= Math.pow(0.90, t)
  }
  state.rotation *= Math.pow(0.90, t)
}

export function decayAIRecoil(state: { kick: number; rotation: number }, delta: number): void {
  state.kick *= Math.pow(0.92, delta / 16)
  if (state.kick < 0.001) state.kick = 0
  state.rotation *= Math.pow(0.88, delta / 16)
  if (Math.abs(state.rotation) < 0.0005) state.rotation = 0
}

export function getDynamicSpread(
  model: GunModelConfig,
  accumulatedSpread: number,
  gunVelocity: number,
): number {
  const recoilPenalty = accumulatedSpread * model.spreadGrowth
  const movementPenalty = Math.min(gunVelocity * 0.001, 0.05)
  return model.bulletSpread + recoilPenalty + movementPenalty
}

export function applyImpactToRecoil(
  state: RecoilState,
  model: GunModelConfig,
  now: number,
  impactMagnitude: number = 1,
): void {
  const n = advanceStack(state, now)
  const damping = fibDampingFactor(n)

  const timeSinceLastShot = now - state.lastShotTime
  const decay = Math.exp(-timeSinceLastShot / 400)
  state.accumulatedSpread = Math.min(1, state.accumulatedSpread * decay + 0.35 * damping)

  const baseBump = 0.15 * (1 - model.stability * 0.4) * impactMagnitude * damping
  state.kick = Math.min(state.kick + baseBump, 0.8)
  state.rotation += gaussianRandom(0, model.recoilAngularKick * 15 * damping)
}

export function isStableEnough(
  state: { kick: number; rotation: number },
  model: GunModelConfig,
): boolean {
  const threshold = 0.15 * (1 - model.stability * 0.5)
  return state.kick < threshold && Math.abs(state.rotation) < threshold * 0.5
}
