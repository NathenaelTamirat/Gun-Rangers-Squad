'use client'

import { GameState } from '../game/types'

interface UIProps {
  state: GameState
  onStart: () => void
  onRestart: () => void
  onNextRound?: () => void
  tournamentActive?: boolean
  tournamentOver?: boolean
}

export function UI({ state, onStart, onRestart, onNextRound, tournamentActive, tournamentOver }: UIProps) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'center', gap: '12px', padding: '10px 0',
    }}>
      {state === 'MENU' && (
        <GameButton onClick={onStart} color="#44cc44">Start Battle</GameButton>
      )}
      {state === 'VICTORY' && tournamentActive && !tournamentOver && onNextRound && (
        <GameButton onClick={onNextRound} color="#44cc44">Next Round</GameButton>
      )}
      {state === 'VICTORY' && (
        <GameButton onClick={onRestart} color="#ff8844">
          {tournamentActive && tournamentOver ? 'New Tournament' : 'New Battle'}
        </GameButton>
      )}
      {(state === 'MENU') && (
        <GameButton onClick={onRestart} color="#ff8844">New Battle</GameButton>
      )}
      {state === 'BATTLE' && (
        <GameButton disabled color="#666">Fighting... <span style={{ fontSize: '11px', color: '#888' }}>SPACE to pause</span></GameButton>
      )}
      {state === 'SLOMO' && <GameButton disabled color="#ffdd44">K.O.!</GameButton>}
      {state === 'PAUSED' && <GameButton disabled color="#88bbff">⏸ Paused</GameButton>}
    </div>
  )
}

function GameButton({ onClick, color, disabled, children }: {
  onClick?: () => void; color: string; disabled?: boolean; children: React.ReactNode
}) {
  return (
    <button
      onClick={() => onClick?.()}
      disabled={disabled}
      style={{
        padding: '10px 28px', fontSize: '16px', fontWeight: 'bold',
        fontFamily: 'monospace', color: '#fff',
        backgroundColor: disabled ? '#444' : color,
        border: disabled ? '1px solid #555' : `2px solid ${color}`,
        borderRadius: '6px', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1, transition: 'all 0.15s ease',
        textTransform: 'uppercase', letterSpacing: '1px',
      }}
      onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.filter = 'brightness(1.2)'; e.currentTarget.style.transform = 'scale(1.05)' } }}
      onMouseLeave={(e) => { if (!disabled) { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none' } }}
    >
      {children}
    </button>
  )
}
