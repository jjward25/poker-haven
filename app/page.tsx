"use client"

import { useState, useEffect } from "react"
import AuthForm from "@/components/auth/auth-form"
import UserDashboard from "@/components/dashboard/user-dashboard"
import GameCreationForm from "@/components/game/game-creation-form"
import PokerTable from "@/components/poker-table"

interface Player {
  _id: string
  username: string
  stats: {
    gamesPlayed: number
    handsDealt: number
    handsPlayed: number
    handsWon: number
    totalWinnings: number
    totalLosses: number
    netEarnings: number
    winPercentage: number
  }
  gameHistory: Array<{
    gameId: string
    date: string
    handsPlayed: number
    handsWon: number
    netEarnings: number
  }>
}

type AppState = 'auth' | 'dashboard' | 'create-game' | 'in-game'

export default function PokerApp() {
  const [appState, setAppState] = useState<AppState>('auth')
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  const [currentGameId, setCurrentGameId] = useState<string | null>(null)

  // Check for existing player session on load
  useEffect(() => {
    const savedPlayer = localStorage.getItem('pokerPlayer')
    if (savedPlayer) {
      try {
        const player = JSON.parse(savedPlayer)
        setCurrentPlayer(player)
        setAppState('dashboard')
      } catch (e) {
        localStorage.removeItem('pokerPlayer')
      }
    }
  }, [])

  const handleAuthSuccess = (player: Player) => {
    setCurrentPlayer(player)
    localStorage.setItem('pokerPlayer', JSON.stringify(player))
    setAppState('dashboard')
  }

  const handleSignOut = () => {
    setCurrentPlayer(null)
    setCurrentGameId(null)
    localStorage.removeItem('pokerPlayer')
    setAppState('auth')
  }

  const handleCreateGame = () => {
    setAppState('create-game')
  }

  const handleGameCreated = (gameId: string) => {
    setCurrentGameId(gameId)
    setAppState('in-game')
  }

  const handleJoinGame = (gameId: string) => {
    setCurrentGameId(gameId)
    setAppState('in-game')
  }

  const handleBackToDashboard = () => {
    setCurrentGameId(null)
    setAppState('dashboard')
  }

  const handleBackToSetup = () => {
    setAppState('create-game')
  }

  if (appState === 'auth') {
    return <AuthForm onAuthSuccess={handleAuthSuccess} />
  }

  if (!currentPlayer) {
    return <AuthForm onAuthSuccess={handleAuthSuccess} />
  }

  if (appState === 'dashboard') {
    return (
      <UserDashboard
        player={currentPlayer}
        onSignOut={handleSignOut}
        onJoinGame={handleJoinGame}
        onCreateGame={handleCreateGame}
      />
    )
  }

  if (appState === 'create-game') {
    return (
      <GameCreationForm
        player={currentPlayer}
        onGameCreated={handleGameCreated}
        onBack={handleBackToDashboard}
      />
    )
  }

  if (appState === 'in-game' && currentGameId) {
    return (
      <PokerTable
        gameId={currentGameId}
        currentPlayer={currentPlayer}
        onBackToSetup={handleBackToSetup}
        onBackToDashboard={handleBackToDashboard}
      />
    )
  }

  // Fallback to dashboard
  return (
    <UserDashboard
      player={currentPlayer}
      onSignOut={handleSignOut}
      onJoinGame={handleJoinGame}
      onCreateGame={handleCreateGame}
    />
  )
}
