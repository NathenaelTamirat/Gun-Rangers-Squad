'use client'

import { GameState } from '../game/types'

interface UIProps {
  state: GameState
  onStart: () => void
  onRestart: () => void
}

export function UI({ state, onStart, onRestart }: UIProps) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '16px',
      padding: '14px 0',
    }}>
      {(state === 'MENU') && (
        <GameButton onClick={onStart} color="#44cc44">
          Start Battle
        </GameButton>
      )}
      {(state === 'VICTORY' || state === 'MENU') && (
        <GameButton onClick={onRestart} color="#ff8844">
          New Battle
        </GameButton>
      )}
      {state === 'BATTLE' && (
        <GameButton disabled color="#666">
          Fighting...
        </GameButton>
      )}
      {state === 'SLOMO' && (
        <GameButton disabled color="#ffdd44">
          K.O.!
        </GameButton>
      )}
    </div>
  )
}

function GameButton({
  onClick,
  color,
  disabled,
  children,
}: {
  onClick?: () => void
  color: string
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={() => onClick?.()}
      disabled={disabled}
      style={{
        padding: '12px 32px',
        fontSize: '18px',
        fontWeight: 'bold',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: disabled ? '#444' : color,
        border: disabled ? '1px solid #555' : `2px solid ${color}`,
        borderRadius: '6px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.15s ease',
        textTransform: 'uppercase',
        letterSpacing: '1px',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.filter = 'brightness(1.2)'
          e.currentTarget.style.transform = 'scale(1.05)'
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.filter = 'none'
          e.currentTarget.style.transform = 'none'
        }
      }}
    >
      {children}
    </button>
  )
}
