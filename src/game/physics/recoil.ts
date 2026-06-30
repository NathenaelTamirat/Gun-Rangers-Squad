import Matter from 'matter-js'
import { GunModelConfig } from '../types'
import {
  MAX_RECOIL_SPEED_DELTA,
  MAX_GUN_TOTAL_SPEED,
  MAX_RECOIL_ANGULAR_KICK,
} from '../constants'

export function gaussianRandom(mean: number, stdDev: number): number {
  const u1 = Math.random(), u2 = Math.random()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return mean + z * stdDev
}

export interface RecoilState {
  kick: number
  rotation: number
  recoveryVelocity: number
  accumulatedSpread: number
  lastShotTime: number
}

export function createRecoilState(): RecoilState {
  return { kick: 0, rotation: 0, recoveryVelocity: 0, accumulatedSpread: 0, lastShotTime: 0 }
}

/**
 * Applies recoil as a direct velocity kick at the gun's center of mass.
 *
 * Rules:
 *  - Direction: exactly OPPOSITE the gun's facing (Newton's 3rd law, always).
 *  - Magnitude: capped at MAX_RECOIL_SPEED_DELTA so a single shot can never exceed it.
 *  - Angular: small controlled spin, capped at MAX_RECOIL_ANGULAR_KICK.
 *  - Recovery: gun slows naturally via frictionAir — no sudden stops.
 */
export function applyRecoilPhysics(
  gunBody: Matter.Body,
  model: GunModelConfig,
  recoilMul: number,
): void {
  const angle = gunBody.angle

  // stability reduces kick (0.3 floor so even high-stability guns feel it)
  const stabilityMul = Math.max(0.3, 1 - model.stability * 0.6)
  const rawImpulse    = model.recoilForce * recoilMul * stabilityMul

  // Hard cap: single shot can add at most MAX_RECOIL_SPEED_DELTA to velocity
  const clampedImpulse = Math.min(rawImpulse, MAX_RECOIL_SPEED_DELTA)

  // Add velocity directly opposite the barrel — pure linear kick
  const newVx = gunBody.velocity.x + (-Math.cos(angle) * clampedImpulse)
  const newVy = gunBody.velocity.y + (-Math.sin(angle) * clampedImpulse)

  // Also cap the resulting total speed so rapid fire can't stack infinitely
  const resultSpeed = Math.hypot(newVx, newVy)
  if (resultSpeed > MAX_GUN_TOTAL_SPEED) {
    const scale = MAX_GUN_TOTAL_SPEED / resultSpeed
    Matter.Body.setVelocity(gunBody, { x: newVx * scale, y: newVy * scale })
  } else {
    Matter.Body.setVelocity(gunBody, { x: newVx, y: newVy })
  }

  // Small angular kick — controlled spin that feels alive, not chaotic
  const rawSpin = model.recoilAngularKick * recoilMul * gaussianRandom(1, 0.15)
  const clampedSpin = Math.min(Math.abs(rawSpin), MAX_RECOIL_ANGULAR_KICK) * Math.sign(rawSpin)
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

  const stabilityMul = Math.max(0.3, 1 - model.stability * 0.6)
  const baseKick  = model.recoilForce * recoilMul * stabilityMul * 20
  const kickAmount = gaussianRandom(baseKick, baseKick * 0.2) * (1 + state.accumulatedSpread * 0.3)

  state.kick = Math.min(state.kick + kickAmount, 0.8)
  state.recoveryVelocity = state.kick * 0.06
  state.rotation = gaussianRandom(0, model.recoilAngularKick * recoilMul * 30)

  state.lastShotTime = now
}

export function decayPlayerRecoil(state: RecoilState, delta: number): void {
  if (state.kick > 0) {
    state.kick -= state.recoveryVelocity
    if (state.kick < 0) state.kick = 0
    state.recoveryVelocity *= 0.90
  }
  state.rotation *= 0.90
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
  const recoilPenalty   = accumulatedSpread * model.spreadGrowth
  const movementPenalty = Math.min(gunVelocity * 0.001, 0.05)
  return model.bulletSpread + recoilPenalty + movementPenalty
}

export function isStableEnough(
  state: { kick: number; rotation: number },
  model: GunModelConfig,
): boolean {
  const threshold = 0.15 * (1 - model.stability * 0.5)
  return state.kick < threshold && Math.abs(state.rotation) < threshold * 0.5
}
