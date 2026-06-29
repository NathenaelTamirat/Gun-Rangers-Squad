import Matter from 'matter-js'
import { getBarrelTip } from '../entities/Gun'
import { RECOIL_VARIANCE } from '../constants'
import { randRange } from '../../utils/math'

export function applyRecoil(gunBody: Matter.Body, gunLength: number, recoilForce: number): void {
  const tip = getBarrelTip(gunBody, gunLength)
  const angle = gunBody.angle
  const variance = randRange(1 - RECOIL_VARIANCE, 1 + RECOIL_VARIANCE)
  const forceMagnitude = recoilForce * variance * gunBody.mass

  const force = {
    x: -Math.cos(angle) * forceMagnitude,
    y: -Math.sin(angle) * forceMagnitude,
  }

  Matter.Body.applyForce(gunBody, tip, force)
}
