'use client'

import { useState, useEffect } from 'react'
import { BattleStats } from '../game/types'
import { getBattleHistory, getTotalStats, BattleRecord } from '../game/database'

export function CheckoutPanel({ battleStats, visible }: {
  battleStats: BattleStats | null
  visible: boolean
}) {
  const [open, setOpen] = useState(false)
  const [records, setRecords] = useState<BattleRecord[]>([])
  const [totals, setTotals] = useState({ totalBattles: 0, wins: 0, losses: 0, totalDamageDealt: 0, totalCriticals: 0 })

  useEffect(() => {
    if (open) {
      getBattleHistory().then(setRecords).catch(() => {})
      getTotalStats().then(setTotals).catch(() => {})
    }
  }, [open])

  if (!visible) return null

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: '6px 16px', fontSize: '11px', fontFamily: 'monospace',
          color: '#888', background: 'none', border: '1px solid #555',
          borderRadius: '4px', cursor: 'pointer', textTransform: 'uppercase',
          letterSpacing: '1px',
        }}
      >
        {open ? 'Close Stats' : 'Check Stats'}
      </button>

      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 900,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.7)',
        }} onClick={() => setOpen(false)}>
          <div style={{
            maxWidth: '520px', width: '92%', maxHeight: '80vh', overflowY: 'auto',
            padding: '24px', backgroundColor: '#1a1a2e', borderRadius: '12px',
            border: '1px solid #444', color: '#ccc', fontFamily: 'monospace',
            fontSize: '13px', lineHeight: '1.6',
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: '#fff', fontSize: '16px', margin: '0 0 12px 0' }}>📊 Career Stats</h2>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <StatBox label="Battles" value={totals.totalBattles} color="#888" />
              <StatBox label="Wins" value={totals.wins} color="#44cc44" />
              <StatBox label="Losses" value={totals.losses} color="#ff4444" />
              <StatBox label="Dmg Dealt" value={totals.totalDamageDealt} color="#ff8844" />
              <StatBox label="Criticals" value={totals.totalCriticals} color="#ff44ff" />
            </div>

            {battleStats && (
              <div style={{ marginBottom: '16px', padding: '10px', backgroundColor: '#111', borderRadius: '6px' }}>
                <div style={{ color: '#aaa', fontSize: '12px', marginBottom: '6px' }}>Last Battle</div>
                <div style={{ display: 'flex', gap: '20px', fontSize: '12px' }}>
                  <span style={{ color: '#4488ff' }}>You: {battleStats.gunA.shotsFired} shots · {battleStats.gunA.hitsLanded} hits · {battleStats.gunA.damageDealt} dmg</span>
                  <span style={{ color: '#ff4444' }}>Enemy: {battleStats.gunB.shotsFired} shots · {battleStats.gunB.hitsLanded} hits · {battleStats.gunB.damageDealt} dmg</span>
                </div>
              </div>
            )}

            <h3 style={{ color: '#aaa', fontSize: '13px', margin: '0 0 8px 0' }}>Recent Battles</h3>
            {records.length === 0 && <div style={{ color: '#666', fontSize: '12px' }}>No battles yet.</div>}
            {records.map(r => (
              <div key={r.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '5px 0', borderBottom: '1px solid #222',
                fontSize: '11px', color: '#888',
              }}>
                <span>
                  {r.playerWon ? <span style={{ color: '#44cc44' }}>W</span> : <span style={{ color: '#ff4444' }}>L</span>}
                  {' '}{r.gunA} vs {r.gunB} on {r.arena}
                </span>
                <span style={{ color: '#666' }}>
                  {r.damageDealt}dmg · {r.criticals}crit · {new Date(r.date).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      padding: '6px 12px', backgroundColor: '#111', borderRadius: '6px',
      border: `1px solid #222`, textAlign: 'center', minWidth: '65px',
    }}>
      <div style={{ color, fontSize: '18px', fontWeight: 'bold' }}>{value}</div>
      <div style={{ color: '#666', fontSize: '10px', marginTop: '2px' }}>{label}</div>
    </div>
  )
}
