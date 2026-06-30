import Matter from 'matter-js'
import { GunData, GameCallbacks, GunModelConfig, ArenaConfig } from '../types'
import { createGunBody } from '../entities/Gun'
import { randRange } from '../../utils/math'
import {
  WALL_THICKNESS, MIN_SPAWN_DISTANCE, GUN_HEALTH, COLORS,
} from '../constants'
import { distance } from '../../utils/math'

export class SpawnSystem {
  spawnGuns(
    world: Matter.World,
    modelA: GunModelConfig,
    modelB: GunModelConfig,
    arena: ArenaConfig,
    _callbacks: GameCallbacks,
  ): { gunA: GunData; gunB: GunData } {
    const spawnA = this.randomPosition(arena)
    const spawnB = this.randomPosition(arena, spawnA)

    const gunAData: GunData = {
      id: 'A',
      label: 'You',
      modelName: modelA.name,
      color: COLORS.GUN_A,
      bulletColor: COLORS.BULLET_A,
      health: GUN_HEALTH,
      maxHealth: GUN_HEALTH,
      model: modelA,
      body: null!,
      powerUps: { shield: false, damageBoost: false },
    }

    const gunBData: GunData = {
      id: 'B',
      label: 'Bot',
      modelName: modelB.name,
      color: COLORS.GUN_B,
      bulletColor: COLORS.BULLET_B,
      health: GUN_HEALTH,
      maxHealth: GUN_HEALTH,
      model: modelB,
      body: null!,
      powerUps: { shield: false, damageBoost: false },
    }

    const bodyA = createGunBody(spawnA.x, spawnA.y, randRange(0, Math.PI * 2), gunAData)
    const bodyB = createGunBody(spawnB.x, spawnB.y, randRange(0, Math.PI * 2), gunBData)

    gunAData.body = bodyA
    gunBData.body = bodyB

    Matter.Composite.add(world, [bodyA, bodyB])

    _callbacks.onHealthChange(GUN_HEALTH, GUN_HEALTH)

    return { gunA: gunAData, gunB: gunBData }
  }

  private randomPosition(arena: ArenaConfig, avoid?: { x: number; y: number }): { x: number; y: number } {
    const padding = WALL_THICKNESS + 60
    let pos: { x: number; y: number }
    let attempts = 0

    do {
      pos = {
        x: randRange(padding, WALL_THICKNESS + arena.width - padding),
        y: randRange(padding, WALL_THICKNESS + arena.height - padding),
      }
      attempts++
    } while (
      avoid &&
      distance(pos.x, pos.y, avoid.x, avoid.y) < MIN_SPAWN_DISTANCE &&
      attempts < 50
    )

    return pos
  }
}
