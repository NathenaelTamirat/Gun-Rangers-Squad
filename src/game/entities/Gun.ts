import Matter from 'matter-js'
import { GunData } from '../types'
import {
  GUN_HEIGHT,
  GUN_RESTITUTION, GUN_FRICTION, GUN_FRICTION_AIR, GUN_ANGULAR_DAMPING,
} from '../constants'

export function createGunBody(x: number, y: number, angle: number, gunData: GunData): Matter.Body {
  const len = gunData.model.length
  const mass = gunData.model.mass

  const body = Matter.Bodies.rectangle(x, y, len, GUN_HEIGHT, {
    mass,
    restitution: GUN_RESTITUTION,
    friction: GUN_FRICTION,
    frictionAir: GUN_FRICTION_AIR,
    angle,
    label: `gun-${gunData.id}`,
    collisionFilter: {
      group: 0,
      category: 0x0002,
      mask: 0x0001 | 0x0002 | 0x0004,
    },
  } as Matter.IBodyDefinition)

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
