'use client'

import { GunSelections } from '../game/types'
import { GUN_MODELS } from '../game/constants'
import { GunIcon } from './GunIcon'

interface GunSelectorProps {
  selections: GunSelections
  onChange: (selections: GunSelections) => void
  disabled: boolean
}

const MODEL_KEYS = Object.keys(GUN_MODELS)

export function GunSelector({ selections, onChange, disabled }: GunSelectorProps) {
  return (
    <div style={{
      display: 'flex',
      gap: '32px',
      padding: '12px 0',
      justifyContent: 'center',
      fontFamily: 'monospace',
      opacity: disabled ? 0.4 : 1,
    }}>
      <GunSelect
        label="Your Gun"
        value={selections.gunA}
        color="#4488ff"
        disabled={disabled}
        onChange={(val) => onChange({ ...selections, gunA: val })}
      />
      <GunSelect
        label="Enemy Gun"
        value={selections.gunB}
        color="#ff4444"
        disabled={disabled}
        allowRandom
        onChange={(val) => onChange({ ...selections, gunB: val })}
      />
    </div>
  )
}

function GunSelect({
  label,
  value,
  color,
  disabled,
  allowRandom = false,
  onChange,
}: {
  label: string
  value: string
  color: string
  disabled: boolean
  allowRandom?: boolean
  onChange: (val: string) => void
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '6px',
    }}>
      <span style={{
        fontWeight: 'bold',
        fontSize: '14px',
        color,
        letterSpacing: '1px',
        textTransform: 'uppercase',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        <GunIcon color={label === 'Your Gun' ? '#4488ff' : '#ff4444'} flipped={label === 'Enemy Gun'} size={28} />
        {label}
      </span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '8px 16px',
          fontSize: '15px',
          fontFamily: 'monospace',
          backgroundColor: '#1a1a2e',
          color: '#ffffff',
          border: `2px solid ${color}`,
          borderRadius: '6px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          minWidth: '140px',
          textAlign: 'center',
        }}
      >
        {allowRandom && <option value="random" style={{ backgroundColor: '#1a1a2e' }}>Random Bot</option>}
        {MODEL_KEYS.map((key) => {
          const model = GUN_MODELS[key]
          return (
            <option key={key} value={key} style={{ backgroundColor: '#1a1a2e' }}>
              {model.name}
            </option>
          )
        })}
      </select>
      <StatBadge value={value} />
    </div>
  )
}

function StatBadge({ value }: { value: string }) {
  const model = GUN_MODELS[value]
  if (!model) {
    return (
      <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: '#999', marginTop: '2px' }}>
        <span>Random weapon</span>
        <span>Random skill</span>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      gap: '10px',
      fontSize: '11px',
      color: '#999',
      marginTop: '2px',
    }}>
      <span>DMG {model.damage}</span>
      <span>×{model.bulletsPerShot}</span>
      <span>SPD {Math.round(model.bulletSpeed * 10) / 10}</span>
    </div>
  )
}
