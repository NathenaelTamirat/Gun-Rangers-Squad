'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { GameCanvas } from '../components/GameCanvas'
import { HUD } from '../components/HUD'
import { UI } from '../components/UI'
import { GunSelector } from '../components/GunSelector'
import { ArenaSelector } from '../components/ArenaSelector'
import { DifficultySlider } from '../components/DifficultySlider'
import { StatsPanel } from '../components/StatsPanel'
import { CheckoutPanel } from '../components/CheckoutPanel'
import { PrivacyConsent } from '../components/PrivacyConsent'
import { BotProfile, GameState, GunSelections, PhysicsSettings, BattleStats, TournamentState } from '../game/types'
import { GUN_MODELS } from '../game/constants'
import { DEFAULT_SETTINGS } from '../game/arenas'
import { Game } from '../game/Game'
import { LEVELS, loadLevelProgress, markLevelComplete, isLevelUnlocked, LevelConfig } from '../game/levels'

type ViewMode = 'free' | 'levels'

export default function Home() {
  const [gunAHealth, setGunAHealth] = useState(100)
  const [gunBHealth, setGunBHealth] = useState(100)
  const [winner, setWinner] = useState<string | null>(null)
  const [gameState, setGameState] = useState<GameState>('MENU')
  const [selections, setSelections] = useState<GunSelections>({ gunA: 'pistol', gunB: 'random' })
  const [arena, setArena] = useState('standard')
  const [settings, setSettings] = useState<PhysicsSettings>({ ...DEFAULT_SETTINGS })
  const [betResult, setBetResult] = useState<{ correct: boolean; streak: number } | null>(null)
  const [betStreak, setBetStreak] = useState(0)
  const [battleStats, setBattleStats] = useState<BattleStats | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('free')
  const [completedLevels, setCompletedLevels] = useState<number[]>([])
  const [currentLevel, setCurrentLevel] = useState<LevelConfig | null>(null)
  const [tournamentScore, setTournamentScore] = useState<{ a: number; b: number } | null>(null)
const [botDifficulty, setBotDifficultyLevel] = useState(3)
  const [botProfile, setBotProfile] = useState<BotProfile | null>(null)
  const gameRef = useRef<Game | null>(null)

  useEffect(() => {
    setCompletedLevels(loadLevelProgress())
    const bet = JSON.parse(localStorage.getItem('recoil_duel_bet') || '{"streak":0,"total":0}')
    setBetStreak(bet.streak)
  }, [])

  // Update bot difficulty in the Game instance whenever it changes
  useEffect(() => {
    if (gameRef.current) {
      gameRef.current.setBotDifficulty(botDifficulty);
    }
  }, [botDifficulty]);

  const applyLevel = useCallback((level: LevelConfig) => {
    setSelections({ gunA: level.gunA, gunB: level.gunB })
    setArena(level.arena)
    setSettings({ ...DEFAULT_SETTINGS })
    setCurrentLevel(level)
    setViewMode('levels')
  }, [])

  const handleHealthChange = useCallback((a: number, b: number) => {
    setGunAHealth(Math.round(a))
    setGunBHealth(Math.round(b))
  }, [])

  const handleWinner = useCallback((gunId: string) => {
    setWinner(gunId === 'A' ? 'You' : 'Enemy')
  }, [])

  const handleStateChange = useCallback((state: GameState) => {
    setGameState(state)
    if (state === 'MENU') {
      setWinner(null); setBattleStats(null); setBetResult(null); setBotProfile(null)
    }
  }, [])

  const handleGameReady = useCallback((game: Game) => {
    gameRef.current = game
  }, [])

  const handleStatsUpdate = useCallback((stats: BattleStats) => {
    setBattleStats(stats)
    if (stats.winnerId === 'A' && currentLevel) {
      const updated = markLevelComplete(currentLevel.id)
      setCompletedLevels(updated)
    }
  }, [currentLevel])

  const handleBotProfile = useCallback((profile: BotProfile) => {
    setBotProfile(profile)
  }, [])

  const handleBetResult = useCallback((correct: boolean, streak: number) => {
    setBetResult({ correct, streak })
    setBetStreak(streak)

    if (correct && currentLevel) {
      const updated = markLevelComplete(currentLevel.id)
      setCompletedLevels(updated)
    }
  }, [currentLevel])

  const handleTournamentUpdate = useCallback((state: TournamentState) => {
    setTournamentScore({ a: state.scoreA, b: state.scoreB })
  }, [])

  const isLevelUnlockedFn = useCallback((id: number) => {
    return isLevelUnlocked(id, completedLevels)
  }, [completedLevels])

  const launch = useCallback(() => {
    setWinner(null); setGunAHealth(100); setGunBHealth(100)
    setBattleStats(null); setBetResult(null)
    setTournamentScore(null)
    setBotProfile(null)

    gameRef.current?.startBattle({
      selections, arena, settings,
      predictedWinner: null,
      tournament: undefined,
    })
  }, [selections, arena, settings])

  const handleStart = useCallback(() => launch(), [launch])

  const handleRestart = useCallback(() => {
    gameRef.current?.reset()
    setWinner(null); setGunAHealth(100); setGunBHealth(100)
    setBattleStats(null); setBetResult(null); setTournamentScore(null); setBotProfile(null)
    setCurrentLevel(null)
  }, [])

  const handleToggleSound = useCallback(() => {
    const next = !soundEnabled
    setSoundEnabled(next)
    gameRef.current?.setSoundEnabled(next)
  }, [soundEnabled])

  const isMenu = gameState === 'MENU'
  const isVictory = gameState === 'VICTORY'
  const isBattle = gameState === 'BATTLE'
  const isSlomo = gameState === 'SLOMO'
  const isPaused = gameState === 'PAUSED'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', padding: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '2px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: '#ddd', fontFamily: 'monospace', letterSpacing: '3px', textTransform: 'uppercase' }}>
          Recoil Duel
        </h1>
        <button onClick={() => { setViewMode(viewMode === 'levels' ? 'free' : 'levels'); setCurrentLevel(null) }}
          style={{ padding: '4px 12px', fontSize: '11px', fontFamily: 'monospace', color: '#888', background: 'none', border: '1px solid #444', borderRadius: '4px', cursor: 'pointer', textTransform: 'uppercase' }}>
          {viewMode === 'levels' ? 'Free Play' : 'Levels'}
        </button>
        <DifficultySlider level={botDifficulty} onChange={setBotDifficultyLevel} />
      </div>

      <HUD
        gunAHealth={gunAHealth} gunBHealth={gunBHealth}
        gunAModel={GUN_MODELS[selections.gunA]?.name ?? ''}
        gunBModel={GUN_MODELS[selections.gunB]?.name ?? 'Random'}
        winner={winner} state={gameState}
        botLabel={botProfile?.label}
        betStreak={betStreak} betResult={betResult}
        tournamentScore={tournamentScore}
        soundEnabled={soundEnabled} onToggleSound={handleToggleSound}
      />

      {isMenu && viewMode === 'levels' && (
        <LevelPanel
          levels={LEVELS}
          completedIds={completedLevels}
          onSelect={applyLevel}
          currentLevel={currentLevel}
          isUnlocked={isLevelUnlockedFn}
        />
      )}

      {isMenu && viewMode === 'free' && (
        <>
          <GunSelector selections={selections} onChange={setSelections} disabled={!isMenu} />
          <ArenaSelector selected={arena} onChange={setArena} disabled={!isMenu} />
        </>
      )}

      {isMenu && currentLevel && (
        <div style={{ fontFamily: 'monospace', color: '#ffdd44', fontSize: '14px', fontWeight: 'bold', padding: '4px 0' }}>
          Level {currentLevel.id}: {currentLevel.name} — {currentLevel.tagline}
          {completedLevels.includes(currentLevel.id) && <span style={{ color: '#44cc44', marginLeft: '8px' }}>✓ Cleared</span>}
        </div>
      )}

      {(isBattle || isSlomo || isPaused) && (
        <div style={{
          fontFamily: 'monospace', fontSize: '12px', color: '#888',
          padding: '2px 0', letterSpacing: '1px',
        }}>
          {isBattle && <span>Tap or click the arena to shoot · recoil aims both guns · <span style={{ color: '#555' }}>SPACE to pause</span></span>}
        </div>
      )}

      <GameCanvas
        onHealthChange={handleHealthChange}
        onWinner={handleWinner}
        onStateChange={handleStateChange}
        onGameReady={handleGameReady}
        onBotProfile={handleBotProfile}
        onStatsUpdate={handleStatsUpdate}
        onBetResult={handleBetResult}
        onTournamentUpdate={handleTournamentUpdate}
      />

      <UI state={gameState} onStart={handleStart} onRestart={handleRestart} />

      <CheckoutPanel battleStats={battleStats} visible={true} />

      {isMenu && viewMode === 'free' && (
        <SettingsPanel settings={settings} onChange={setSettings} disabled={!isMenu} />
      )}

      {isVictory && battleStats && currentLevel && completedLevels.includes(currentLevel.id) && (
        <div style={{ color: '#44cc44', fontSize: '16px', fontWeight: 'bold', fontFamily: 'monospace', marginTop: '4px' }}>
          Level {currentLevel.id} Cleared! ✓
        </div>
      )}

      <StatsPanel stats={battleStats} visible={isVictory} />

      {isVictory && winner && (
        <div style={{ color: '#ffdd44', fontSize: '20px', fontWeight: 'bold', fontFamily: 'monospace', marginTop: '2px', textShadow: '0 0 20px rgba(255,221,68,0.4)' }}>
          {winner} Wins!
        </div>
      )}

      <a href="/privacy" style={{
        marginTop: '16px', fontSize: '11px', fontFamily: 'monospace',
        color: '#555', textDecoration: 'none', letterSpacing: '1px',
      }}>
        Privacy Policy
      </a>

      <PrivacyConsent />
    </div>
  )
}

function LevelPanel({ levels, completedIds, onSelect, currentLevel, isUnlocked }: {
  levels: LevelConfig[]
  completedIds: number[]
  onSelect: (l: LevelConfig) => void
  currentLevel: LevelConfig | null
  isUnlocked: (id: number) => boolean
}) {
  return (
    <div style={{
      display: 'flex', gap: '8px', padding: '8px 0', fontFamily: 'monospace',
    }}>
      {levels.map((level) => {
        const unlocked = isUnlocked(level.id)
        const cleared = completedIds.includes(level.id)
        const active = currentLevel?.id === level.id
        return (
          <button
            key={level.id}
            onClick={() => unlocked && onSelect(level)}
            disabled={!unlocked}
            style={{
              padding: '8px 16px', fontSize: '12px', fontFamily: 'monospace',
              color: cleared ? '#44cc44' : active ? '#fff' : unlocked ? '#aaa' : '#444',
              backgroundColor: active ? '#223' : 'transparent',
              border: active ? '2px solid #4488ff' : cleared ? '2px solid #44cc44' : unlocked ? '2px solid #444' : '2px solid #222',
              borderRadius: '8px', cursor: unlocked ? 'pointer' : 'not-allowed',
              opacity: unlocked ? 1 : 0.5, transition: 'all 0.15s ease',
              textAlign: 'center', minWidth: '80px',
            }}
          >
            <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{level.name}</div>
            <div style={{ fontSize: '10px', color: unlocked ? '#888' : '#555', marginTop: '2px' }}>{level.tagline}</div>
            {cleared && <div style={{ fontSize: '14px', marginTop: '2px' }}>✓</div>}
          </button>
        )
      })}
    </div>
  )
}

function SettingsPanel({ settings, onChange, disabled }: {
  settings: PhysicsSettings
  onChange: (s: PhysicsSettings) => void
  disabled: boolean
}) {
  return (
    <div style={{
      display: 'flex', gap: '16px', padding: '6px 0', fontFamily: 'monospace',
      fontSize: '12px', color: '#888', opacity: disabled ? 0.4 : 1,
    }}>
      <label>Gravity X <input type="range" min={-2} max={2} step={0.1} value={settings.gravityX}
        onChange={e => onChange({ ...settings, gravityX: parseFloat(e.target.value) })} disabled={disabled} /></label>
      <label>Gravity Y <input type="range" min={-2} max={2} step={0.1} value={settings.gravityY}
        onChange={e => onChange({ ...settings, gravityY: parseFloat(e.target.value) })} disabled={disabled} /></label>
      <label>Recoil <input type="range" min={0} max={3} step={0.1} value={settings.recoilMultiplier}
        onChange={e => onChange({ ...settings, recoilMultiplier: parseFloat(e.target.value) })} disabled={disabled} /></label>
      <label>Bounce <input type="range" min={0} max={2} step={0.1} value={settings.restitutionMultiplier}
        onChange={e => onChange({ ...settings, restitutionMultiplier: parseFloat(e.target.value) })} disabled={disabled} /></label>
      <label>Speed <input type="range" min={0.5} max={3} step={0.1} value={settings.bulletSpeedMultiplier}
        onChange={e => onChange({ ...settings, bulletSpeedMultiplier: parseFloat(e.target.value) })} disabled={disabled} /></label>
    </div>
  )
}
