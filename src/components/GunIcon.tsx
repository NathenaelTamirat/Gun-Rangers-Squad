'use client'

export function GunIcon({ color, flipped = false, size = 28 }: {
  color: string
  flipped?: boolean
  size?: number
}) {
  return (
    <svg
      viewBox="0 0 100 60"
      width={size}
      height={Math.round(size * 0.6)}
      style={{ transform: flipped ? 'scaleX(-1)' : 'none', display: 'block' }}
    >
      {/* Main barrel */}
      <rect x="55" y="24" width="42" height="8" rx="2" fill={color} />
      {/* Barrel tip */}
      <rect x="90" y="26" width="8" height="4" rx="1" fill={lighten(color, 30)} />
      {/* Slide */}
      <rect x="40" y="22" width="18" height="12" rx="2" fill={color} />
      {/* Trigger guard */}
      <path d="M22 34 L22 44 Q22 49 28 49 L36 49 Q42 49 42 44 L42 34" fill="none" stroke={color} strokeWidth="2.5" />
      {/* Trigger */}
      <line x1="30" y1="34" x2="30" y2="42" stroke={lighten(color, 40)} strokeWidth="3" strokeLinecap="round" />
      {/* Grip */}
      <polygon points="26,34 28,34 24,56 20,56" fill={color} />
      {/* Grip lines */}
      <line x1="23" y1="42" x2="27" y2="42" stroke={lighten(color, 20)} strokeWidth="1.5" />
      <line x1="22" y1="46" x2="26" y2="46" stroke={lighten(color, 20)} strokeWidth="1.5" />
      <line x1="21" y1="50" x2="25" y2="50" stroke={lighten(color, 20)} strokeWidth="1.5" />
      {/* Sight front */}
      <rect x="86" y="18" width="3" height="6" rx="1" fill={lighten(color, 40)} />
      {/* Sight rear */}
      <rect x="62" y="20" width="2" height="4" rx="1" fill={lighten(color, 40)} />
    </svg>
  )
}

function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + amount)
  const g = Math.min(255, ((num >> 8) & 0xFF) + amount)
  const b = Math.min(255, (num & 0xFF) + amount)
  return `rgb(${r},${g},${b})`
}
