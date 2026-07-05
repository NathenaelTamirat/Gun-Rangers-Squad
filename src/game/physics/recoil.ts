import Matter from 'matter-js'
import { GunModelConfig } from '../types'
import {
  MAX_GUN_TOTAL_SPEED,
  MAX_RECOIL_ANGULAR_KICK,
  RECOIL_STABLE_EPSILON,
  RECOIL_FIB_CAP_INDEX,
} from '../constants'

export function gaussianRandom(mean: number, stdDev: number): number {
  const u1 = Math.random(), u2 = Math.random()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return mean + z * stdDev
}

// ---------------------------------------------------------------------------
// Fibonacci² stacking damper
//
// Physical justification: a body already carrying residual recoil momentum
// has less "room" to cleanly absorb a fresh impulse — part of the new impulse
// fights the existing momentum vector instead of adding to it cleanly. We
// model that lost-efficiency as a damping factor 1/fib(n)^2, where n counts
// consecutive recoil-causing events (shots, wall hits, gun-gun hits) since
// the gun last returned to rest (kick ≈ 0).
//
// fib(1)=1 fib(2)=1 fib(3)=2 fib(4)=3 fib(5)=5 fib(6)=8 fib(7)=13...
// factor:   1    1    0.25   0.111  0.04   0.0156 0.0059
//
// It converges to ~0 fast, which is intentional: it is a STACKING damper,
// not a general recoil-strength curve. A gun that fully recovers between
// events always gets full-strength recoil (rule 1) — this only suppresses
// runaway accumulation when events land faster than the gun can settle.
// ---------------------------------------------------------------------------

// fibCache[i] stores F(i+1) in the 1-indexed sequence F(1)=1, F(2)=1, F(3)=2...
// (i.e. fibCache[0]=F(1), fibCache[1]=F(2), fibCache[2]=F(3), ...)
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
  const f = fibonacci(n)
  return 1 / (f * f)
}

export interface RecoilState {
  kick: number                // current linear recoil magnitude (px/frame-equivalent), decays toward 0
  rotation: number             // current angular recoil velocity contribution
  recoveryVelocity: number
  accumulatedSpread: number    // 0..1, feeds bulletSpread penalty
  lastShotTime: number
  stackCount: number           // n in the Fibonacci damper — consecutive events since last full recovery
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

/**
 * Advances the stack counter for a new recoil-causing event.
 * Resets to n=1 if the gun had fully recovered (kick ≈ 0) since the last
 * event — this is the "physically coherent reset" condition: residual
 * stacking penalty only exists while residual motion exists, never on a
 * fixed timer.
 */
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
// Rule 1 — Shooting impulse (momentum conservation)
//
//   J = m_bullet * v_bullet         (bullet momentum imparted)
//   Δv_gun = -J / m_gun             (equal & opposite, scaled by gun mass)
//
// This is why shooting is "high intensity" by construction: bullet momentum
// is large relative to gun mass. No special-casing needed — it falls out of
// physics. recoilForce in GunModelConfig is a per-model scalar tuning the
// effective bullet momentum for that weapon (heavier "virtual round" for
// sniper/shotgun), not an arbitrary kick number.
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

  // stability reduces kick (0.3 floor so even high-stability guns feel it)
  const stabilityMul = Math.max(0.3, 1 - model.stability * 0.6)

  // Momentum-conservation impulse: J = m_bullet_equivalent * v, expressed via
  // recoilForce (calibrated per-model) then normalized by the gun's own mass
  // so heavier guns visibly resist recoil more (real physics: Δv = J/m).
  const impulseMagnitude = model.recoilForce * recoilMul * stabilityMul * 1000
  const rawDeltaV = impulseMagnitude / model.mass

  // Fibonacci stacking damper only bites when events are landing back-to-back
  // before the gun settles — a clean, fully-recovered shot always gets n=1
  // (damping = 1), i.e., full strength, satisfying "if the user shoots,
  // intensity should be high."
  const clampedImpulse = rawDeltaV * damping

  const newVx = gunBody.velocity.x + (-Math.cos(angle) * clampedImpulse)
  const newVy = gunBody.velocity.y + (-Math.sin(angle) * clampedImpulse)

  const resultSpeed = Math.hypot(newVx, newVy)
  if (resultSpeed > MAX_GUN_TOTAL_SPEED) {
    const scale = MAX_GUN_TOTAL_SPEED / resultSpeed
    Matter.Body.setVelocity(gunBody, { x: newVx * scale, y: newVy * scale })
  } else {
    Matter.Body.setVelocity(gunBody, { x: newVx, y: newVy })
  }

  // Random direction each shot — gives the rotation a lively, unpredictable feel
  const spinDir = Math.random() < 0.5 ? 1 : -1
  const spinMag = gaussianRandom(0.7, 0.2)
  const rawSpin = model.recoilAngularKick * recoilMul * damping * spinDir * Math.max(0.3, spinMag)
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

  const n = state.stackCount || 1
  const damping = fibDampingFactor(n)

  const stabilityMul = Math.max(0.3, 1 - model.stability * 0.6)
  const baseKick = model.recoilForce * recoilMul * stabilityMul * 20 * damping
  const kickAmount = gaussianRandom(baseKick, baseKick * 0.2) * (1 + state.accumulatedSpread * 0.3)

  state.kick = Math.min(state.kick + kickAmount, 0.8)
  state.recoveryVelocity = state.kick * 0.06
  state.rotation = gaussianRandom(0, model.recoilAngularKick * recoilMul * 30 * damping)

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

// ---------------------------------------------------------------------------
// Rule 2 + Rule 3 combined — impact-driven recoil with vector-summed
// simultaneous touches
//
// Rule 2: every impact event advances the Fibonacci stack counter and gets
// damped by 1/fib(n)^2 if the gun hasn't fully recovered since the last event.
//
// Rule 3: when a gun experiences 2+ collisions in the same physics tick, we
// do NOT apply each collision's full recoil independently (that would let
// simultaneous hits add up to MORE recoil than either alone, which is
// backwards). Instead the caller vector-sums the raw impulses from all
// collisions touching this gun this tick (see combineSimultaneousImpulses)
// and applies the *combined* impulse once through this function. This is
// physically correct: opposing impulses partially cancel (a gun pinched
// between a wall and the other gun nets LESS kick than either hit alone),
// while aligned impulses still add — you don't need a separate flat penalty,
// it falls out of vector addition.
// ---------------------------------------------------------------------------
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

/**
 * Vector-sums impulses from multiple simultaneous collisions on the same
 * body (Rule 3). Pass every collision-normal impulse vector affecting this
 * gun during the current physics tick; returns the net magnitude to feed
 * into applyImpactToRecoil as `impactMagnitude`, normalized against the
 * strongest individual impulse so a single hit still maps to ~1.0.
 */
export function combineSimultaneousImpulses(
  impulses: { x: number; y: number }[],
): number {
  if (impulses.length === 0) return 0
  if (impulses.length === 1) return Math.hypot(impulses[0].x, impulses[0].y)

  let sumX = 0, sumY = 0
  let maxSingle = 0
  for (const imp of impulses) {
    sumX += imp.x
    sumY += imp.y
    maxSingle = Math.max(maxSingle, Math.hypot(imp.x, imp.y))
  }
  const netMagnitude = Math.hypot(sumX, sumY)
  if (maxSingle < 1e-6) return 0

  // Normalize relative to the strongest single impulse in the group, so:
  //  - two aligned impulses -> netMagnitude ≈ sum -> ratio > 1 (still adds)
  //  - two opposing impulses -> netMagnitude ≈ 0 -> ratio ≈ 0 (cancels)
  //  - two perpendicular impulses -> ratio ≈ 0.7 (partial)
  return netMagnitude / maxSingle
}

export function isStableEnough(
  state: { kick: number; rotation: number },
  model: GunModelConfig,
): boolean {
  const threshold = 0.15 * (1 - model.stability * 0.5)
  return state.kick < threshold && Math.abs(state.rotation) < threshold * 0.5
}