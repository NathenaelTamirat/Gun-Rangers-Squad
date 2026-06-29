'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { GameCanvas } from '../components/GameCanvas'
import { HUD } from '../components/HUD'
import { UI } from '../components/UI'
import { GunSelector } from '../components/GunSelector'
import { ArenaSelector } from '../components/ArenaSelector'
import { StatsPanel } from '../components/StatsPanel'
import { SettingsPanel } from '../components/PhysicsSettings'
import { GameState, GunSelections, PhysicsSettings, BattleStats, TournamentState, TournamentConfig } from '../game/types'
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
  const [selections, setSelections] = useState<GunSelections>({ gunA: 'pistol', gunB: 'pistol' })
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
  const [showTooltip, setShowTooltip] = useState<string | null>(null)
  const gameRef = useRef<Game | null>(null)

  useEffect(() => {
    setCompletedLevels(loadLevelProgress())
    const bet = JSON.parse(localStorage.getItem('recoil_duel_bet') || '{"streak":0,"total":0}')
    setBetStreak(bet.streak)
  }, [])

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
    setWinner(gunId === 'A' ? 'Gun A' : 'Gun B')
  }, [])

  const handleStateChange = useCallback((state: GameState) => {
    setGameState(state)
    if (state === 'MENU') {
      setWinner(null); setBattleStats(null); setBetResult(null)
    }
  }, [])

  const handleGameReady = useCallback((game: Game) => {
    gameRef.current = game
  }, [])

  const handleStatsUpdate = useCallback((stats: BattleStats) => {
    setBattleStats(stats)
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

  const launch = useCallback((predictedGun: string | null) => {
    if (predictedGun) (window as any).__betPrediction = predictedGun
    else (window as any).__betPrediction = null
    setWinner(null); setGunAHealth(100); setGunBHealth(100)
    setBattleStats(null); setBetResult(null)
    setTournamentScore(null)

    const tournConf: TournamentConfig | undefined = undefined

    gameRef.current?.startBattle({
      selections, arena, settings,
      predictedWinner: predictedGun,
      tournament: tournConf,
    })
  }, [selections, arena, settings])

  const handleBetA = useCallback(() => launch('A'), [launch])
  const handleBetB = useCallback(() => launch('B'), [launch])
  const handleStart = useCallback(() => launch(null), [launch])

  const handleRestart = useCallback(() => {
    gameRef.current?.reset()
    setWinner(null); setGunAHealth(100); setGunBHealth(100)
    setBattleStats(null); setBetResult(null); setTournamentScore(null)
    setCurrentLevel(null)
  }, [])

  const handleToggleSound = useCallback(() => {
    const next = !soundEnabled
    setSoundEnabled(next)
    gameRef.current?.setSoundEnabled(next)
  }, [soundEnabled])

  const isMenu = gameState === 'MENU'
  const isVictory = gameState === 'VICTORY'

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
      </div>

      <HUD
        gunAHealth={gunAHealth} gunBHealth={gunBHealth}
        gunAModel={GUN_MODELS[selections.gunA]?.name ?? ''}
        gunBModel={GUN_MODELS[selections.gunB]?.name ?? ''}
        winner={winner} state={gameState}
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

      <GameCanvas
        onHealthChange={handleHealthChange}
        onWinner={handleWinner}
        onStateChange={handleStateChange}
        onGameReady={handleGameReady}
        onStatsUpdate={handleStatsUpdate}
        onBetResult={handleBetResult}
        onTournamentUpdate={handleTournamentUpdate}
      />

      {isMenu && (
        <div style={{ display: 'flex', gap: '10px', padding: '6px 0' }}>
          <BetButton color="#4488ff" label="Bet Gun A" disabled={!isMenu} onClick={handleBetA} />
          <BetButton color="#ff4444" label="Bet Gun B" disabled={!isMenu} onClick={handleBetB} />
        </div>
      )}

      <UI state={gameState} onStart={handleStart} onRestart={handleRestart} />

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
    </div>
  )
}

function BetButton({ color, label, disabled, onClick }: {
  color: string; label: string; disabled: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '7px 22px', fontSize: '13px', fontWeight: 'bold', fontFamily: 'monospace',
      color: '#fff', backgroundColor: disabled ? '#222' : color,
      border: `2px solid ${color}`, borderRadius: '6px',
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1,
      textTransform: 'uppercase', letterSpacing: '1px', transition: 'all 0.15s ease',
    }}>
      {label}
    </button>
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
