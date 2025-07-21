"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LogOut, Plus, Users, TrendingUp, Target, Archive, DollarSign, Trash2, Crown } from "lucide-react"

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

interface Game {
  _id: string
  gameName: string
  status: string
  createdBy: string
  players: Array<{ username: string; playerId: string }>
  settings: {
    startingChips: number
    smallBlind: number
    bigBlind: number
    maxPlayers: number
  }
  createdAt: string
}

interface UserDashboardProps {
  player: Player
  onSignOut: () => void
  onJoinGame: (gameId: string) => void
  onCreateGame: () => void
}

export default function UserDashboard({ player, onSignOut, onJoinGame, onCreateGame }: UserDashboardProps) {
  const [activeGames, setActiveGames] = useState<Game[]>([])
  const [playerGames, setPlayerGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchGames = async () => {
    try {
      setLoading(true)
      
      // Fetch active games
      const activeResponse = await fetch("/api/games?activeOnly=true")
      const activeData = await activeResponse.json()
      
      // Fetch player's games
      const playerResponse = await fetch(`/api/games?playerId=${player._id}`)
      const playerData = await playerResponse.json()
      
      if (activeResponse.ok && playerResponse.ok) {
        setActiveGames(activeData)
        setPlayerGames(playerData)
      } else {
        setError("Failed to fetch games")
      }
    } catch (error) {
      setError("Network error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGames()
    // Silently clean up orphaned stats in background
    silentCleanup()
  }, [player._id])

  const silentCleanup = async () => {
    try {
      await fetch("/api/players", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "cleanupStats",
          playerId: player._id
        }),
      })
      // Don't show any UI feedback - just let it clean up silently
    } catch (error) {
      // Fail silently
    }
  }

  const handleJoinGame = async (gameId: string) => {
    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "joinGame",
          gameId,
          playerId: player._id,
          username: player.username,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        onJoinGame(gameId)
      } else {
        setError(data.error || "Failed to join game")
      }
    } catch (error) {
      setError("Network error occurred")
    }
  }

  const handleArchiveGame = async (gameId: string) => {
    if (!confirm("Are you sure you want to archive this game? This will end the game and remove all players.")) {
      return
    }

    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "archiveGame",
          gameId: gameId
        }),
      })

      const data = await response.json()

      if (response.ok) {
        await fetchGames() // Refresh the games list
      } else {
        setError(data.error || "Failed to archive game")
      }
    } catch (error) {
      setError("Network error occurred")
    }
  }

  const handleDeleteGame = async (gameId: string) => {
    if (!confirm("Are you sure you want to permanently delete this game? This action cannot be undone.")) {
      return
    }

    try {
      const response = await fetch(`/api/games?gameId=${gameId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (response.ok) {
        await fetchGames() // Refresh the games list
        setError("") // Clear any existing errors
      } else {
        setError(data.error || "Failed to delete game")
      }
    } catch (error) {
      setError("Network error occurred")
    }
  }

  const cleanupPlayerStats = async () => {
    try {
      const response = await fetch("/api/players", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "cleanupStats",
          playerId: player._id
        }),
      })

      if (response.ok) {
        // Just refresh the page to load clean data
        window.location.reload()
      } else {
        setError("Failed to cleanup stats")
      }
    } catch (error) {
      setError("Network error occurred during cleanup")
    }
  }

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString()}`
  }

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`
  }

  const calculateRealDollarStats = () => {
    const realDollarStats: Array<{ gameName: string; realValue: number }> = []

    // Calculate real dollar values for games with real dollar multiplier
    // Note: Deleted games are automatically excluded since they're removed from the database
    playerGames.forEach(game => {
      if ((game.settings as any).realDollarMultiplier) {
        const multiplier = (game.settings as any).realDollarMultiplier
        const playerInGame = game.players.find((p: any) => p.playerId === player._id) as any
        
        if (playerInGame && playerInGame.chips !== undefined) {
          const startingChips = game.settings.startingChips
          const currentChips = playerInGame.chips
          const chipDifference = currentChips - startingChips
          const realValue = parseFloat((chipDifference * multiplier).toFixed(2))
          
          realDollarStats.push({
            gameName: game.gameName + (game.status !== 'completed' ? ` (${game.status})` : ''),
            realValue: realValue
          })
        }
      }
    })

    return realDollarStats
  }



  return (
    <div className="min-h-screen bg-green-900 p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-white">Poker Haven</h1>
          <Badge variant="outline" className="text-white border-white">
            Welcome, {player.username}
          </Badge>
        </div>
        <Button variant="outline" onClick={onSignOut}>
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Player Stats */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Your Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{player.stats.gamesPlayed}</div>
                  <div className="text-sm text-muted-foreground">Games Played</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{player.stats.handsPlayed}</div>
                  <div className="text-sm text-muted-foreground">Hands Played</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatPercentage(player.stats.winPercentage)}</div>
                  <div className="text-sm text-muted-foreground">Win Rate</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${player.stats.netEarnings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(player.stats.netEarnings)}
                  </div>
                  <div className="text-sm text-muted-foreground">Net Earnings (Chips)</div>
                </div>
              </div>

              {/* Real Dollar Value Section */}
              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Real Dollar Value
                </h4>
                <div className="space-y-2">
                  {calculateRealDollarStats().map((stat, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-green-50 rounded">
                      <span className="text-sm font-medium">{stat.gameName}</span>
                                             <span className={`text-sm font-bold ${stat.realValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                         ${stat.realValue.toFixed(2)}
                       </span>
                    </div>
                  ))}
                  {calculateRealDollarStats().length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No real dollar tracking available for your games
                    </p>
                  )}
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span>Total Winnings:</span>
                  <span className="text-green-600">{formatCurrency(player.stats.totalWinnings)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Losses:</span>
                  <span className="text-red-600">{formatCurrency(player.stats.totalLosses)}</span>
                </div>
                <div className="pt-2">
                  <Button 
                    variant="outline"
                    size="sm" 
                    onClick={cleanupPlayerStats}
                    className="w-full text-xs"
                  >
                    Clean Up Stats
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    Remove stats from deleted games
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Games Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Create New Game */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Start New Game
                </span>
                <Button onClick={onCreateGame}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Game
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Set up a new poker game with custom settings and invite your friends to play.
              </p>
            </CardContent>
          </Card>

          {/* Your Games */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Your Games
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading games...</p>
              ) : playerGames.length > 0 ? (
                <div className="space-y-3">
                  {playerGames.map((game) => (
                    <div key={game._id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <h4 className="font-semibold">{game.gameName}</h4>
                        <p className="text-sm text-muted-foreground">
                          {game.players.length}/{game.settings.maxPlayers} players • 
                          Blinds: {formatCurrency(game.settings.smallBlind)}/{formatCurrency(game.settings.bigBlind)}
                          {game.createdBy === player._id && <span className="text-blue-600"> • You created this game</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={game.status === 'active' ? 'default' : 'secondary'}>
                          {game.status}
                        </Badge>
                        {game.createdBy === player._id && (
                          <>
                            {game.status !== 'archived' && (
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleArchiveGame(game._id)}
                              >
                                <Archive className="w-4 h-4 mr-1" />
                                Archive
                              </Button>
                            )}
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => handleDeleteGame(game._id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => onJoinGame(game._id)}
                        >
                          Join Game
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">You haven&apos;t joined any games yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Available Games */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Available Games
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading available games...</p>
              ) : activeGames.filter(game => !game.players.some(p => p.playerId === player._id)).length > 0 ? (
                <div className="space-y-3">
                  {activeGames
                    .filter(game => !game.players.some(p => p.playerId === player._id))
                    .map((game) => (
                      <div key={game._id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <h4 className="font-semibold">{game.gameName}</h4>
                          <p className="text-sm text-muted-foreground">
                            {game.players.length}/{game.settings.maxPlayers} players • 
                            Blinds: {formatCurrency(game.settings.smallBlind)}/{formatCurrency(game.settings.bigBlind)} •
                            Starting chips: {formatCurrency(game.settings.startingChips)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{game.status}</Badge>
                          <Button 
                            size="sm"
                            onClick={() => handleJoinGame(game._id)}
                            disabled={game.players.length >= game.settings.maxPlayers}
                          >
                            Join Game
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No available games at the moment.</p>
              )}
            </CardContent>
          </Card>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  )
} 