'use client'

import { BattleStats } from '../game/types'

interface StatsPanelProps {
  stats: BattleStats | null
  visible: boolean
}

export function StatsPanel({ stats, visible }: StatsPanelProps) {
  if (!visible || !stats) return null

  const a = stats.gunA
  const b = stats.gunB
  const aAcc = a.shotsFired > 0 ? Math.round((a.hitsLanded / a.shotsFired) * 100) : 0
  const bAcc = b.shotsFired > 0 ? Math.round((b.hitsLanded / b.shotsFired) * 100) : 0

  return (
    <div style={{
      backgroundColor: '#111122',
      border: '2px solid #444',
      borderRadius: '10px',
      padding: '16px 24px',
      marginTop: '8px',
      fontFamily: 'monospace',
      minWidth: '420px',
    }}>
      <div style={{ textAlign: 'center', color: '#ddd', fontWeight: 'bold', fontSize: '16px', marginBottom: '10px', letterSpacing: '2px', textTransform: 'uppercase' }}>
        Battle Stats
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ color: '#888', borderBottom: '1px solid #333' }}>
            <th style={{ textAlign: 'left', padding: '6px 8px' }}></th>
            <th style={{ textAlign: 'center', padding: '6px 8px', color: '#4488ff' }}>Gun A</th>
            <th style={{ textAlign: 'center', padding: '6px 8px', color: '#ff4444' }}>Gun B</th>
          </tr>
        </thead>
        <tbody>
          <Row label="Shots" va={a.shotsFired} vb={b.shotsFired} />
          <Row label="Hits" va={a.hitsLanded} vb={b.hitsLanded} />
          <Row label="Accuracy" va={`${aAcc}%`} vb={`${bAcc}%`} />
          <Row label="Damage" va={a.damageDealt} vb={b.damageDealt} />
          <Row label="Wall Bounces" va={a.wallBounces} vb={b.wallBounces} />
        </tbody>
      </table>
      <div style={{ textAlign: 'center', marginTop: '8px', color: '#ffdd44', fontSize: '14px' }}>
        Winner: {stats.winnerId === 'A' ? 'Gun A' : 'Gun B'}
      </div>
    </div>
  )
}

function Row({ label, va, vb }: { label: string; va: string | number; vb: string | number }) {
  return (
    <tr style={{ borderBottom: '1px solid #222' }}>
      <td style={{ padding: '5px 8px', color: '#999' }}>{label}</td>
      <td style={{ textAlign: 'center', padding: '5px 8px', color: '#88bbff' }}>{va}</td>
      <td style={{ textAlign: 'center', padding: '5px 8px', color: '#ff8888' }}>{vb}</td>
    </tr>
  )
}
