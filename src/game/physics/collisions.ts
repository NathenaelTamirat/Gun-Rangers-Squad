import Matter from 'matter-js'
import { ArenaConfig } from '../types'
import { WALL_THICKNESS } from '../constants'

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

export function isBulletOutOfBounds(body: Matter.Body, arena: ArenaConfig): boolean {
  const { x, y } = body.position
  const margin = WALL_THICKNESS + 50
  return (
    x < -margin ||
    x > arena.width + margin + WALL_THICKNESS * 2 ||
    y < -margin ||
    y > arena.height + margin + WALL_THICKNESS * 2
  )
}

export function getGunIdFromBody(body: Matter.Body): string {
  return body.label.replace('gun-', '')
}
