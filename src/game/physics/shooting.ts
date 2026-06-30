import Matter from 'matter-js'
import { getBarrelTip, getBarrelAngle } from '../entities/Gun'
import { createBulletBody } from '../entities/Bullet'
import { GunModelConfig, BulletData } from '../types'

export function shoot(
  gunBody: Matter.Body,
  ownerId: string,
  world: Matter.World,
  model: GunModelConfig,
  dynamicSpread?: number,
): BulletData[] {
  const tip = getBarrelTip(gunBody, model.length)
  const angle = getBarrelAngle(gunBody)
  const bullets: BulletData[] = []
  const spread = dynamicSpread ?? model.bulletSpread

  for (let i = 0; i < model.bulletsPerShot; i++) {
    const spreadAngle = (Math.random() - 0.5) * spread
    const bulletAngle = angle + spreadAngle
    const spawnX = tip.x + Math.cos(bulletAngle) * 8
    const spawnY = tip.y + Math.sin(bulletAngle) * 8

    const vx = Math.cos(bulletAngle) * model.bulletSpeed
    const vy = Math.sin(bulletAngle) * model.bulletSpeed

    const body = createBulletBody(spawnX, spawnY, vx, vy, ownerId)
    Matter.Composite.add(world, body)

    bullets.push({
      ownerId,
      body,
      damage: model.damage,
      critical: false,
      prevX: spawnX,
      prevY: spawnY,
    })
  }

  return bullets
}
