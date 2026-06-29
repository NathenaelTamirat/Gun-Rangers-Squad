'use client'

import { useState, useCallback, useRef } from 'react'
import { GameCanvas } from '../components/GameCanvas'
import { HUD } from '../components/HUD'
import { UI } from '../components/UI'
import { GunSelector } from '../components/GunSelector'
import { GameState, GunSelections } from '../game/types'
import { GUN_MODELS } from '../game/constants'
import { Game } from '../game/Game'

export default function Home() {
  const [gunAHealth, setGunAHealth] = useState(100)
  const [gunBHealth, setGunBHealth] = useState(100)
  const [winner, setWinner] = useState<string | null>(null)
  const [gameState, setGameState] = useState<GameState>('MENU')
  const [selections, setSelections] = useState<GunSelections>({
    gunA: 'pistol',
    gunB: 'pistol',
  })
  const gameRef = useRef<Game | null>(null)

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
    }
  }, [])

  const handleGameReady = useCallback((game: Game) => {
    gameRef.current = game
  }, [])

  const handleStart = useCallback(() => {
    setWinner(null)
    setGunAHealth(100)
    setGunBHealth(100)
    gameRef.current?.startBattle(selections)
  }, [selections])

  const handleRestart = useCallback(() => {
    gameRef.current?.reset()
    setWinner(null)
    setGunAHealth(100)
    setGunBHealth(100)
  }, [])

  const isMenu = gameState === 'MENU'

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
    }}>
      <h1 style={{
        fontSize: '28px',
        fontWeight: 'bold',
        color: '#ddd',
        fontFamily: 'monospace',
        letterSpacing: '3px',
        textTransform: 'uppercase',
        marginBottom: '4px',
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
      />

      <GunSelector
        selections={selections}
        onChange={setSelections}
        disabled={!isMenu}
      />

      <GameCanvas
        onHealthChange={handleHealthChange}
        onWinner={handleWinner}
        onStateChange={handleStateChange}
        onGameReady={handleGameReady}
      />

      <UI
        state={gameState}
        onStart={handleStart}
        onRestart={handleRestart}
      />

      {gameState === 'VICTORY' && winner && (
        <div style={{
          color: '#ffdd44',
          fontSize: '24px',
          fontWeight: 'bold',
          fontFamily: 'monospace',
          marginTop: '4px',
          textShadow: '0 0 20px rgba(255, 221, 68, 0.4)',
        }}>
          {winner} Wins!
        </div>
      )}
    </div>
  )
}
