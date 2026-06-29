import { RoundStats, BattleStats } from '../types'

export class StatsSystem {
  private gunA: RoundStats = this.fresh()
  private gunB: RoundStats = this.fresh()

  private fresh(): RoundStats {
    return { shotsFired: 0, hitsLanded: 0, damageDealt: 0, wallBounces: 0, criticals: 0 }
  }

  recordShot(gunId: string): void {
    this.get(gunId).shotsFired++
  }

  recordHit(gunId: string, damage: number): void {
    const s = this.get(gunId)
    s.hitsLanded++
    s.damageDealt += damage
  }

  recordCritical(gunId: string): void {
    this.get(gunId).criticals++
  }

  recordWallBounce(): void {
    this.gunA.wallBounces++
    this.gunB.wallBounces++
  }

  private get(gunId: string): RoundStats {
    return gunId === 'A' ? this.gunA : this.gunB
  }

  getStats(winnerId: string): BattleStats {
    return { gunA: { ...this.gunA }, gunB: { ...this.gunB }, winnerId }
  }

  reset(): void {
    this.gunA = this.fresh()
    this.gunB = this.fresh()
  }
}
