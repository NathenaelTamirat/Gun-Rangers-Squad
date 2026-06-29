import Matter from 'matter-js'
import { BULLET_RADIUS, BULLET_MASS } from '../constants'

export function createBulletBody(x: number, y: number, vx: number, vy: number, ownerId: string): Matter.Body {
  const body = Matter.Bodies.circle(x, y, BULLET_RADIUS, {
    mass: BULLET_MASS,
    frictionAir: 0,
    friction: 0,
    restitution: 0,
    label: `bullet-${ownerId}`,
    collisionFilter: {
      group: 0,
      category: 0x0004,
      mask: 0x0001 | 0x0002,
    },
  })

  Matter.Body.setVelocity(body, { x: vx, y: vy })

  return body
}
