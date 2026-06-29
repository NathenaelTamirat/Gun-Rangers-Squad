import { randRange, randInt } from '../../utils/math'

export class RandomSystem {
  pickShooter(gunIds: string[]): string {
    if (gunIds.length === 0) return ''
    const idx = randInt(0, gunIds.length - 1)
    return gunIds[idx]
  }

  nextFireDelay(min: number, max: number): number {
    return randRange(min, max)
  }
}
