import Matter from 'matter-js'
import { BulletData } from '../types'
import { ARENA_WIDTH, ARENA_HEIGHT, WALL_THICKNESS } from '../constants'

export function isWallCollision(body: Matter.Body): boolean {
  return body.label.startsWith('wall')
}

export function isBulletCollision(body: Matter.Body): boolean {
  return body.label.startsWith('bullet-')
}

export function isGunCollision(body: Matter.Body): boolean {
  return body.label.startsWith('gun-')
}

export function getBodyOwnerId(body: Matter.Body): string {
  return body.label.split('-')[1]
}

export function isBulletOutOfBounds(body: Matter.Body): boolean {
  const { x, y } = body.position
  const margin = WALL_THICKNESS + 50
  return (
    x < -margin ||
    x > ARENA_WIDTH + margin ||
    y < -margin ||
    y > ARENA_HEIGHT + margin
  )
}

export function getGunIdFromBody(body: Matter.Body): string {
  return body.label.replace('gun-', '')
}
