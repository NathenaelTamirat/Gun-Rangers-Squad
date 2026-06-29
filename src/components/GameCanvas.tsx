'use client'

import { useEffect, useRef } from 'react'
import { Game } from '../game/Game'
import { GameCallbacks, GameState } from '../game/types'
import { ARENAS } from '../game/arenas'
import { WALL_THICKNESS } from '../game/constants'

interface GameCanvasProps {
  onHealthChange: (gunA: number, gunB: number) => void
  onWinner: (gunId: string) => void
  onStateChange: (state: GameState) => void
  onGameReady: (game: Game) => void
  onStatsUpdate?: (stats: any) => void
  onBetResult?: (correct: boolean, streak: number) => void
}

export function GameCanvas({ onHealthChange, onWinner, onStateChange, onGameReady, onStatsUpdate, onBetResult }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<Game | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const callbacks: GameCallbacks = {
      onHealthChange,
      onWinner,
      onStateChange,
      onStatsUpdate: onStatsUpdate || (() => {}),
      onBetResult: onBetResult || (() => {}),
    }

    const game = new Game(canvas, callbacks)
    gameRef.current = game
    onGameReady(game)

    return () => {
      game.destroy()
      gameRef.current = null
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={ARENAS.standard.width + WALL_THICKNESS * 2}
      height={ARENAS.standard.height + WALL_THICKNESS * 2}
      style={{
        display: 'block',
        margin: '0 auto',
        borderRadius: '8px',
        border: '2px solid #444',
      }}
    />
  )
}
