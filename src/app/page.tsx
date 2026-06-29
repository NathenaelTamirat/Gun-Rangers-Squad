'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { GameCanvas } from '../components/GameCanvas'
import { HUD } from '../components/HUD'
import { UI } from '../components/UI'
import { GunSelector } from '../components/GunSelector'
import { ArenaSelector } from '../components/ArenaSelector'
import { StatsPanel } from '../components/StatsPanel'
import { SettingsPanel } from '../components/PhysicsSettings'
import { GameState, GunSelections, PhysicsSettings, BattleStats } from '../game/types'
import { GUN_MODELS } from '../game/constants'
import { DEFAULT_SETTINGS } from '../game/arenas'
import { Game } from '../game/Game'

export default function Home() {
  const [gunAHealth, setGunAHealth] = useState(100)
  const [gunBHealth, setGunBHealth] = useState(100)
  const [winner, setWinner] = useState<string | null>(null)
  const [gameState, setGameState] = useState<GameState>('MENU')
  const [selections, setSelections] = useState<GunSelections>({ gunA: 'pistol', gunB: 'pistol' })
  const [arena, setArena] = useState('standard')
  const [settings, setSettings] = useState<PhysicsSettings>({ ...DEFAULT_SETTINGS })
  const [predicted, setPredicted] = useState<string | null>(null)
  const [betResult, setBetResult] = useState<{ correct: boolean; streak: number } | null>(null)
  const [betStreak, setBetStreak] = useState(0)
  const [betTotal, setBetTotal] = useState(0)
  const [battleStats, setBattleStats] = useState<BattleStats | null>(null)
  const gameRef = useRef<Game | null>(null)

  useEffect(() => {
    const key = 'recoil_duel_bet'
    const data = JSON.parse(localStorage.getItem(key) || '{"streak":0,"total":0}')
    setBetStreak(data.streak)
    setBetTotal(data.total)
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
      setWinner(null)
      setBattleStats(null)
      setBetResult(null)
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
    const key = 'recoil_duel_bet'
    const data = JSON.parse(localStorage.getItem(key) || '{"streak":0,"total":0}')
    setBetTotal(data.total)
  }, [])

  const predictAndStart = useCallback((gunId: string) => {
    setPredicted(gunId)
    ;(window as any).__betPrediction = gunId
    setWinner(null)
    setGunAHealth(100)
    setGunBHealth(100)
    setBattleStats(null)
    setBetResult(null)
    gameRef.current?.startBattle({ selections, arena, settings, predictedWinner: gunId })
  }, [selections, arena, settings])

  const handleStart = useCallback(() => {
    setPredicted(null)
    ;(window as any).__betPrediction = null
    setWinner(null)
    setGunAHealth(100)
    setGunBHealth(100)
    setBattleStats(null)
    setBetResult(null)
    gameRef.current?.startBattle({ selections, arena, settings })
  }, [selections, arena, settings])

  const handleRestart = useCallback(() => {
    gameRef.current?.reset()
    setWinner(null)
    setGunAHealth(100)
    setGunBHealth(100)
    setBattleStats(null)
    setBetResult(null)
    setPredicted(null)
  }, [])

  const isMenu = gameState === 'MENU'

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '16px',
    }}>
      <h1 style={{
        fontSize: '28px', fontWeight: 'bold', color: '#ddd',
        fontFamily: 'monospace', letterSpacing: '3px',
        textTransform: 'uppercase', marginBottom: '2px',
      }}>
        Recoil Duel
      </h1>

      <HUD
        gunAHealth={gunAHealth}
        gunBHealth={gunBHealth}
        gunAModel={GUN_MODELS[selections.gunA]?.name ?? ''}
        gunBModel={GUN_MODELS[selections.gunB]?.name ?? ''}
        winner={winner}
        state={gameState}
        betStreak={betStreak}
        betResult={betResult}
      />

      {isMenu && (
        <>
          <GunSelector selections={selections} onChange={setSelections} disabled={!isMenu} />
          <ArenaSelector selected={arena} onChange={setArena} disabled={!isMenu} />
        </>
      )}

      <GameCanvas
        onHealthChange={handleHealthChange}
        onWinner={handleWinner}
        onStateChange={handleStateChange}
        onGameReady={handleGameReady}
        onStatsUpdate={handleStatsUpdate}
        onBetResult={handleBetResult}
      />

      {isMenu && (
        <div style={{ display: 'flex', gap: '10px', padding: '8px 0' }}>
          <BetButton color="#4488ff" label="Bet Gun A" disabled={!isMenu} onClick={() => predictAndStart('A')} />
          <BetButton color="#ff4444" label="Bet Gun B" disabled={!isMenu} onClick={() => predictAndStart('B')} />
        </div>
      )}

      <UI state={gameState} onStart={handleStart} onRestart={handleRestart} />

      {isMenu && (
        <SettingsPanel settings={settings} onChange={setSettings} disabled={!isMenu} />
      )}

      <StatsPanel stats={battleStats} visible={gameState === 'VICTORY'} />

      {gameState === 'VICTORY' && winner && (
        <div style={{
          color: '#ffdd44', fontSize: '22px', fontWeight: 'bold',
          fontFamily: 'monospace', marginTop: '4px',
          textShadow: '0 0 20px rgba(255, 221, 68, 0.4)',
        }}>
          {winner} Wins!
        </div>
      )}
    </div>
  )
}

function BetButton({ color, label, disabled, onClick }: {
  color: string
  label: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 24px', fontSize: '14px', fontWeight: 'bold',
        fontFamily: 'monospace', color: '#fff',
        backgroundColor: disabled ? '#222' : color,
        border: `2px solid ${color}`,
        borderRadius: '6px', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        textTransform: 'uppercase', letterSpacing: '1px',
        transition: 'all 0.15s ease',
      }}
    >
      {label}
    </button>
  )
}
