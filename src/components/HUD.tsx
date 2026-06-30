'use client'

import { GameState } from '../game/types'
import { GunIcon } from './GunIcon'

interface HUDProps {
  gunAHealth: number
  gunBHealth: number
  gunAModel: string
  gunBModel: string
  winner: string | null
  state: GameState
  botLabel?: string
  betStreak?: number
  betResult?: { correct: boolean; streak: number } | null
  tournamentScore?: { a: number; b: number } | null
  soundEnabled?: boolean
  onToggleSound?: () => void
}

export function HUD({
  gunAHealth, gunBHealth, gunAModel, gunBModel,
  winner, state, botLabel, betStreak = 0, betResult,
  tournamentScore, soundEnabled = true, onToggleSound,
}: HUDProps) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      gap: '20px', padding: '6px 0', color: '#fff',
      fontFamily: 'monospace', fontSize: '15px',
      width: '100%', maxWidth: '860px', position: 'relative',
    }}>
      <GunBlock label="YOU" model={gunAModel} health={gunAHealth} color="#4488ff" align="right" />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minWidth: '130px' }}>
        {state === 'BATTLE' && <span style={{ color: '#ffff88', fontSize: '14px' }}>⚔ BATTLE</span>}
        {botLabel && state === 'BATTLE' && <span style={{ color: '#aaa', fontSize: '10px' }}>{botLabel}</span>}
        {state === 'SLOMO' && <span style={{ color: '#ffdd44', fontSize: '16px', fontWeight: 'bold' }}>K.O.</span>}
        {state === 'PAUSED' && <span style={{ color: '#88bbff', fontSize: '14px', fontWeight: 'bold' }}>⏸ PAUSED</span>}
        {winner && <span style={{ color: '#ffdd44', fontWeight: 'bold', fontSize: '13px' }}>{winner} Wins!</span>}
        {betResult && (
          <span style={{ color: betResult.correct ? '#44ff44' : '#ff4444', fontSize: '11px', fontWeight: 'bold' }}>
            {betResult.correct ? '✓ Correct!' : '✗ Wrong!'} Streak: {betResult.streak}
          </span>
        )}
        {betStreak > 0 && state === 'MENU' && (
          <span style={{ color: '#ffdd44', fontSize: '10px' }}>🔥 Streak: {betStreak}</span>
        )}
        {tournamentScore && (
          <span style={{ color: '#aaa', fontSize: '12px' }}>
            {tournamentScore.a} : {tournamentScore.b}
          </span>
        )}
      </div>

      <GunBlock label="ENEMY" model={gunBModel} health={gunBHealth} color="#ff4444" align="left" />

      {onToggleSound && (
        <button
          onClick={onToggleSound}
          style={{
            position: 'absolute', right: '0', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: '1px solid #444', borderRadius: '4px',
            color: '#888', cursor: 'pointer', fontSize: '14px', padding: '4px 8px',
            fontFamily: 'monospace',
          }}
          title={soundEnabled ? 'Mute' : 'Unmute'}
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>
      )}
    </div>
  )
}

function GunBlock({ label, model, health, color, align }: {
  label: string; model: string; health: number; color: string; align: 'left' | 'right'
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '6px', minWidth: '170px',
      flexDirection: align === 'right' ? 'row' : 'row-reverse',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: align === 'right' ? 'flex-end' : 'flex-start', minWidth: '65px' }}>
        <span style={{ color, fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <GunIcon color={align === 'right' ? '#4488ff' : '#ff4444'} flipped={align === 'left'} size={22} />
          {label}
        </span>
        {model && <span style={{ color: '#888', fontSize: '10px' }}>{model}</span>}
      </div>
      <div style={{ width: '80px', height: '12px', backgroundColor: '#222', borderRadius: '2px', overflow: 'hidden', border: '1px solid #444' }}>
        <div style={{ width: `${Math.max(0, Math.min(100, health))}%`, height: '100%', backgroundColor: health > 30 ? '#44cc44' : '#ff4444', transition: 'width 0.2s ease' }} />
      </div>
      <span style={{ minWidth: '22px', textAlign: 'center', fontSize: '12px', color: health > 30 ? '#88ff88' : '#ff8888', fontWeight: 'bold' }}>
        {Math.round(health)}
      </span>
    </div>
  )
}
