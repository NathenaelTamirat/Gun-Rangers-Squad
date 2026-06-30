import Matter from 'matter-js'
import { GunModelConfig } from '../types'
import { getBarrelTip } from '../entities/Gun'

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

export function applyRecoilPhysics(
  gunBody: Matter.Body,
  model: GunModelConfig,
  recoilMul: number,
): void {
  const angle = gunBody.angle
  const stabilityMul = 1 - model.stability
  const impulse = gaussianRandom(1, 0.1) * model.recoilForce * recoilMul * stabilityMul * gunBody.mass

  const forceX = -Math.cos(angle) * impulse
  const forceY = -Math.sin(angle) * impulse

  const barrelTip = getBarrelTip(gunBody, model.length)
  Matter.Body.applyForce(gunBody, barrelTip, { x: forceX, y: forceY })

  const microKick = gaussianRandom(0, 0.008)
  Matter.Body.setAngularVelocity(
    gunBody,
    gunBody.angularVelocity + model.recoilAngularKick * stabilityMul * recoilMul + microKick,
  )
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

  const stabilityMul = 1 - model.stability
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
    state.recoveryVelocity *= 0.88
  }
  state.rotation *= 0.88
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
