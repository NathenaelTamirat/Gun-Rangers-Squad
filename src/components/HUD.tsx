'use client'

import { GameState } from '../game/types'

interface HUDProps {
  gunAHealth: number
  gunBHealth: number
  gunAModel: string
  gunBModel: string
  winner: string | null
  state: GameState
  betStreak?: number
  betResult?: { correct: boolean; streak: number } | null
}

export function HUD({ gunAHealth, gunBHealth, gunAModel, gunBModel, winner, state, betStreak = 0, betResult }: HUDProps) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '24px',
      padding: '8px 0',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontSize: '16px',
    }}>
      <GunHudBlock
        label="Gun A"
        model={gunAModel}
        health={gunAHealth}
        color="#4488ff"
        align="right"
      />

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2px',
        minWidth: '120px',
      }}>
        {state === 'BATTLE' && (
          <span style={{ color: '#ffff88', fontSize: '16px' }}>⚔</span>
        )}
        {state === 'SLOMO' && (
          <span style={{ color: '#ffdd44', fontSize: '18px', fontWeight: 'bold' }}>K.O.</span>
        )}
        {winner && (
          <span style={{ color: '#ffdd44', fontWeight: 'bold', fontSize: '14px', textAlign: 'center' }}>
            {winner} Wins!
          </span>
        )}
        {betResult && (
          <span style={{
            color: betResult.correct ? '#44ff44' : '#ff4444',
            fontSize: '12px',
            fontWeight: 'bold',
          }}>
            {betResult.correct ? '✓ Correct!' : '✗ Wrong!'} Streak: {betResult.streak}
          </span>
        )}
        {betStreak > 0 && state === 'MENU' && (
          <span style={{ color: '#ffdd44', fontSize: '11px' }}>
            🔥 Win Streak: {betStreak}
          </span>
        )}
      </div>

      <GunHudBlock
        label="Gun B"
        model={gunBModel}
        health={gunBHealth}
        color="#ff4444"
        align="left"
      />
    </div>
  )
}

function GunHudBlock({
  label, model, health, color, align,
}: {
  label: string
  model: string
  health: number
  color: string
  align: 'left' | 'right'
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      minWidth: '180px',
      flexDirection: align === 'right' ? 'row' : 'row-reverse',
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: align === 'right' ? 'flex-end' : 'flex-start',
        minWidth: '70px',
      }}>
        <span style={{ color, fontWeight: 'bold', fontSize: '14px' }}>{label}</span>
        {model && <span style={{ color: '#888', fontSize: '11px' }}>{model}</span>}
      </div>
      <div style={{
        width: '90px', height: '14px', backgroundColor: '#222',
        borderRadius: '3px', overflow: 'hidden', border: '1px solid #444',
      }}>
        <div style={{
          width: `${Math.max(0, Math.min(100, health))}%`,
          height: '100%',
          backgroundColor: health > 30 ? '#44cc44' : '#ff4444',
          transition: 'width 0.2s ease',
          borderRadius: '2px',
        }} />
      </div>
      <span style={{
        minWidth: '24px', textAlign: 'center', fontSize: '13px',
        color: health > 30 ? '#88ff88' : '#ff8888', fontWeight: 'bold',
      }}>
        {Math.round(health)}
      </span>
    </div>
  )
}
