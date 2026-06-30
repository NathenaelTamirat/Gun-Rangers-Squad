import Matter from 'matter-js'
import { GunData } from '../types'
import {
  GUN_HEIGHT,
  GUN_FRICTION, GUN_ANGULAR_DAMPING,
} from '../constants'

export function createGunBody(x: number, y: number, angle: number, gunData: GunData): Matter.Body {
  const len = gunData.model.length
  const mass = gunData.model.mass

  const opts: Matter.IBodyDefinition = {
    mass,
    restitution: gunData.model.restitution,
    friction: GUN_FRICTION,
    frictionAir: gunData.model.frictionAir,
    angle,
    label: `gun-${gunData.id}`,
    collisionFilter: {
      group: 0,
      category: 0x0002,
      mask: 0x0001 | 0x0002 | 0x0004,
    },
  }

  if (gunData.model.customInertia !== undefined) {
    opts.inertia = gunData.model.customInertia
  }

  const body = Matter.Bodies.rectangle(x, y, len, GUN_HEIGHT, opts)

  ;(body as any).angularDamping = GUN_ANGULAR_DAMPING

  return body
}

export function getBarrelTip(body: Matter.Body, gunLength: number): { x: number; y: number } {
  const angle = body.angle
  const halfLength = gunLength / 2
  return {
    x: body.position.x + Math.cos(angle) * halfLength,
    y: body.position.y + Math.sin(angle) * halfLength,
  }
}

export function getBarrelAngle(body: Matter.Body): number {
  return body.angle
}
