'use client'

import { useState } from 'react'
import { PhysicsSettings } from '../game/types'
import { DEFAULT_SETTINGS } from '../game/arenas'

interface SettingsPanelProps {
  settings: PhysicsSettings
  onChange: (settings: PhysicsSettings) => void
  disabled: boolean
}

export function SettingsPanel({ settings, onChange, disabled }: SettingsPanelProps) {
  const [open, setOpen] = useState(false)

  const update = (partial: Partial<PhysicsSettings>) => {
    onChange({ ...settings, ...partial })
  }

  return (
    <div style={{ fontFamily: 'monospace', marginTop: '4px' }}>
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        style={{
          background: 'none',
          border: 'none',
          color: disabled ? '#444' : '#888',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: '13px',
          textDecoration: 'underline',
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}
      >
        {open ? '− Physics Settings' : '+ Physics Settings'}
      </button>

      {open && (
        <div style={{
          backgroundColor: '#111122',
          border: '1px solid #333',
          borderRadius: '8px',
          padding: '14px 20px',
          marginTop: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          minWidth: '380px',
        }}>
          <SliderRow
            label="Recoil Strength"
            min={0.2} max={3} step={0.1}
            value={settings.recoilMultiplier}
            onChange={(v) => update({ recoilMultiplier: v })}
          />
          <SliderRow
            label="Bullet Speed"
            min={0.3} max={3} step={0.1}
            value={settings.bulletSpeedMultiplier}
            onChange={(v) => update({ bulletSpeedMultiplier: v })}
          />
          <SliderRow
            label="Bounciness"
            min={0} max={2} step={0.1}
            value={settings.restitutionMultiplier}
            onChange={(v) => update({ restitutionMultiplier: v })}
          />
          <SliderRow
            label="Gravity X"
            min={-5} max={5} step={0.5}
            value={settings.gravityX}
            onChange={(v) => update({ gravityX: v })}
          />
          <SliderRow
            label="Gravity Y"
            min={-5} max={5} step={0.5}
            value={settings.gravityY}
            onChange={(v) => update({ gravityY: v })}
          />

          <button
            onClick={() => onChange({ ...DEFAULT_SETTINGS })}
            style={{
              marginTop: '6px',
              padding: '6px',
              fontSize: '12px',
              fontFamily: 'monospace',
              color: '#888',
              backgroundColor: '#222',
              border: '1px solid #444',
              borderRadius: '4px',
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            Reset to Default
          </button>
        </div>
      )}
    </div>
  )
}

function SliderRow({
  label, min, max, step, value, onChange,
}: {
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ color: '#aaa', fontSize: '12px', minWidth: '110px', textAlign: 'right' }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: '#4488ff' }}
      />
      <span style={{ color: '#ddd', fontSize: '12px', minWidth: '30px', textAlign: 'right' }}>{value.toFixed(1)}</span>
    </div>
  )
}
