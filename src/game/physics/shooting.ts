import Matter from 'matter-js'
import { getBarrelTip, getBarrelAngle } from '../entities/Gun'
import { createBulletBody } from '../entities/Bullet'
import { GunModelConfig, BulletData } from '../types'

export function shoot(
  gunBody: Matter.Body,
  ownerId: string,
  world: Matter.World,
  model: GunModelConfig,
): BulletData[] {
  const tip = getBarrelTip(gunBody, model.length)
  const angle = getBarrelAngle(gunBody)
  const bullets: BulletData[] = []

  for (let i = 0; i < model.bulletsPerShot; i++) {
    const spread = (Math.random() - 0.5) * model.bulletSpread
    const bulletAngle = angle + spread

    const vx = Math.cos(bulletAngle) * model.bulletSpeed
    const vy = Math.sin(bulletAngle) * model.bulletSpeed

    const body = createBulletBody(tip.x, tip.y, vx, vy, ownerId)
    Matter.Composite.add(world, body)

    bullets.push({
      ownerId,
      body,
      damage: model.damage,
      critical: false,
    })
  }

  return bullets
}
