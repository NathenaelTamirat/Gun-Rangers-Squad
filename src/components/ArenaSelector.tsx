'use client'

import { ArenaConfig } from '../game/types'
import { ARENAS } from '../game/arenas'

interface ArenaSelectorProps {
  selected: string
  onChange: (id: string) => void
  disabled: boolean
}

const ARENA_KEYS = Object.keys(ARENAS)

export function ArenaSelector({ selected, onChange, disabled }: ArenaSelectorProps) {
  return (
    <div style={{
      display: 'flex',
      gap: '10px',
      justifyContent: 'center',
      padding: '6px 0',
      fontFamily: 'monospace',
      opacity: disabled ? 0.4 : 1,
      pointerEvents: disabled ? 'none' : 'auto',
    }}>
      <span style={{ color: '#888', fontSize: '13px', alignSelf: 'center' }}>Arena:</span>
      {ARENA_KEYS.map((key) => {
        const arena = ARENAS[key]
        const active = selected === key
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontFamily: 'monospace',
              color: active ? '#fff' : '#888',
              backgroundColor: active ? '#333' : 'transparent',
              border: active ? `2px solid #4488ff` : '2px solid #333',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {arena.name}
          </button>
        )
      })}
    </div>
  )
}
