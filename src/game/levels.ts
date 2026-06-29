export interface LevelConfig {
  id: number
  name: string
  tagline: string
  gunA: string
  gunB: string
  arena: string
  description: string
}

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: 'The Beginning',
    tagline: 'Fair Fight',
    gunA: 'pistol',
    gunB: 'pistol',
    arena: 'standard',
    description: 'Two pistols. Equal odds. Who wins?',
  },
  {
    id: 2,
    name: 'Armed Better',
    tagline: 'Advantage',
    gunA: 'pistol',
    gunB: 'rifle',
    arena: 'standard',
    description: 'Gun B gets a Rifle. Can Gun A overcome?',
  },
  {
    id: 3,
    name: 'Close Quarters',
    tagline: 'Chaos',
    gunA: 'shotgun',
    gunB: 'rifle',
    arena: 'compact',
    description: 'Shotgun vs Rifle in a tight arena.',
  },
  {
    id: 4,
    name: 'The Gauntlet',
    tagline: 'Champion',
    gunA: 'shotgun',
    gunB: 'rifle',
    arena: 'wide',
    description: 'Wide open. No rules. Predict the winner.',
  },
]

const STORAGE_KEY = 'recoil_duel_levels'

export function loadLevelProgress(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

export function saveLevelProgress(completedIds: number[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completedIds))
  } catch {}
}

export function markLevelComplete(levelId: number): number[] {
  const completed = loadLevelProgress()
  if (!completed.includes(levelId)) {
    completed.push(levelId)
    saveLevelProgress(completed)
  }
  return completed
}

export function isLevelUnlocked(levelId: number, completedIds: number[]): boolean {
  if (levelId === 1) return true
  return completedIds.includes(levelId - 1)
}
