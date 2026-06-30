import Matter from 'matter-js'
import { GunModelConfig } from '../types'

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
 * Applies recoil as a pure opposite-direction impulse at the gun's center of mass.
 * Direction = exactly opposite to the gun's angle (Newton's 3rd law).
 * No torque is added here — spin comes naturally from physics.
 */
export function applyRecoilPhysics(
  gunBody: Matter.Body,
  model: GunModelConfig,
  recoilMul: number,
): void {
  const angle = gunBody.angle
  // Net impulse scaled by gun mass so heavier guns kick less
  const stabilityMul = 1 - model.stability * 0.5 // stability reduces kick, but doesn't eliminate it
  const impulse = gaussianRandom(1, 0.08) * model.recoilForce * recoilMul * stabilityMul

  // Straight back — exactly opposite of the barrel direction
  const forceX = -Math.cos(angle) * impulse
  const forceY = -Math.sin(angle) * impulse

  // Apply at center of mass so it's a pure linear kick, no torque
  Matter.Body.applyForce(gunBody, gunBody.position, { x: forceX, y: forceY })
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

  const stabilityMul = 1 - model.stability * 0.5
  const baseKick = model.recoilForce * recoilMul * stabilityMul * 20
  const kickAmount = gaussianRandom(baseKick, baseKick * 0.25) * (1 + state.accumulatedSpread * 0.4)

  state.kick = Math.min(state.kick + kickAmount, 0.8)
  state.recoveryVelocity = state.kick * 0.06
  state.rotation = gaussianRandom(0, model.recoilAngularKick * recoilMul * 40)

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
  const recoilPenalty = accumulatedSpread * model.spreadGrowth
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

export function applyRecoilToPosition(
  gunBody: Matter.Body,
  state: { kick: number },
): void {
  if (state.kick > 0.01) {
    const angle = gunBody.angle
    const push = state.kick * 0.05
    Matter.Body.applyForce(gunBody, gunBody.position, {
      x: -Math.cos(angle) * push * gunBody.mass,
      y: -Math.sin(angle) * push * gunBody.mass,
    })
  }
}
