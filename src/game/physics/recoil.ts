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
  /** Tracks cumulative recoil velocity for the hard/soft cap system */
  recoilVelocityMag: number
}

export function createRecoilState(): RecoilState {
  return {
    kick: 0,
    rotation: 0,
    recoveryVelocity: 0,
    accumulatedSpread: 0,
    lastShotTime: 0,
    recoilVelocityMag: 0,
  }
}

/**
 * Applies recoil as a pure opposite-direction velocity impulse directly to the gun body.
 *
 * Direction: EXACTLY opposite to the gun's facing angle (Newton's 3rd law).
 *   - Gun aimed SE  →  kicked NW
 *   - Gun aimed N   →  kicked S
 *
 * Rotation: Applied only when the gun is aimed diagonally (between axes).
 *   Diagonal = when neither |cos(angle)| nor |sin(angle)| is close to 1.
 *   Wild spin added proportional to the diagonal component.
 *
 * Cap system (passed in via recoilVelocityMag on the state):
 *   - Hard cap for first 2 shots equivalent: full impulse, no reduction
 *   - Soft cap after: diminishing returns (impulse *= 1 / (1 + excess))
 *
 * @param state  Player/AI recoil state that tracks accumulated velocity
 */
export function applyRecoilPhysics(
  gunBody: Matter.Body,
  model: GunModelConfig,
  recoilMul: number,
  state?: RecoilState,
): void {
  const angle = gunBody.angle

  // ── 1. Compute raw impulse magnitude ────────────────────────────────────────
  // Large enough to fling gun almost across the arena in one shot.
  // stabilityMul: stability reduces kick but never eliminates it (min 0.25)
  const stabilityMul = Math.max(0.25, 1 - model.stability * 0.6)
  const baseImpulse = model.recoilForce * recoilMul * stabilityMul

  // ── 2. Hard / soft cap ──────────────────────────────────────────────────────
  // Hard cap threshold = 2× baseImpulse (i.e. first 2 shots worth of accumulated velocity)
  const HARD_CAP_THRESHOLD = baseImpulse * 2
  let effectiveImpulse = baseImpulse

  if (state) {
    if (state.recoilVelocityMag < HARD_CAP_THRESHOLD) {
      // Still within hard cap zone — full impulse
      effectiveImpulse = baseImpulse
    } else {
      // Soft cap zone — diminishing returns
      const excess = state.recoilVelocityMag - HARD_CAP_THRESHOLD
      effectiveImpulse = baseImpulse / (1 + excess / HARD_CAP_THRESHOLD)
    }
    state.recoilVelocityMag += effectiveImpulse
  }

  // ── 3. Apply velocity directly (not force) for immediate dramatic kick ───────
  // Using setVelocity delta so we ADD to existing velocity, not replace it.
  const kickX = -Math.cos(angle) * effectiveImpulse
  const kickY = -Math.sin(angle) * effectiveImpulse

  Matter.Body.setVelocity(gunBody, {
    x: gunBody.velocity.x + kickX,
    y: gunBody.velocity.y + kickY,
  })

  // ── 4. Rotation — only when aimed diagonally ────────────────────────────────
  // Diagonal factor: 0 when perfectly horizontal/vertical, 1 at 45°
  const cosA = Math.abs(Math.cos(angle))
  const sinA = Math.abs(Math.sin(angle))
  // Diagonal-ness: peaks at 45° (when cos ≈ sin ≈ 0.707), zero at 0°/90°
  const diagonalFactor = 1 - Math.abs(cosA - sinA) // 0→1→0 as angle goes 0→45→90
  const spinMagnitude = model.recoilAngularKick * recoilMul * diagonalFactor * 2.5
  const spinDirection = Math.random() < 0.5 ? 1 : -1 // chaotic — random direction
  Matter.Body.setAngularVelocity(
    gunBody,
    gunBody.angularVelocity + spinDirection * gaussianRandom(spinMagnitude, spinMagnitude * 0.3),
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

  const stabilityMul = Math.max(0.25, 1 - model.stability * 0.6)
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
  // Recoil velocity magnitude decays over time (gun slows naturally)
  state.recoilVelocityMag *= Math.pow(0.94, delta / 16)
  if (state.recoilVelocityMag < 0.0001) state.recoilVelocityMag = 0
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
