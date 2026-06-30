import { ArenaConfig, PhysicsSettings } from './types'

export const ARENAS: Record<string, ArenaConfig> = {
  standard: {
    id: 'standard',
    name: 'Standard',
    width: 800,
    height: 600,
    label: 'Classic 800x600',
  },
  compact: {
    id: 'compact',
    name: 'Compact',
    width: 600,
    height: 450,
    label: 'Fast-paced 600x450',
  },
  wide: {
    id: 'wide',
    name: 'Wide',
    width: 1000,
    height: 500,
    label: 'Open 1000x500',
  },
  tall: {
    id: 'tall',
    name: 'Tall',
    width: 600,
    height: 800,
    label: 'Vertical 600x800',
  },
}

export const DEFAULT_SETTINGS: PhysicsSettings = {
  gravityX: 0,
  gravityY: 0.5,
  recoilMultiplier: 1,
  restitutionMultiplier: 1,
  bulletSpeedMultiplier: 1,
}
