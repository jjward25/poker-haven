"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Settings, Users, DollarSign } from "lucide-react"
import { Switch } from "@/components/ui/switch"

interface GameCreationFormProps {
  player: { _id: string; username: string }
  onGameCreated: (gameId: string) => void
  onBack: () => void
}

export default function GameCreationForm({ player, onGameCreated, onBack }: GameCreationFormProps) {
  const [gameName, setGameName] = useState("")
  const [invitedPlayers, setInvitedPlayers] = useState("")
  const [numBots, setNumBots] = useState(0)
  const [startingChips, setStartingChips] = useState(10000)
  const [smallBlind, setSmallBlind] = useState(50)
  const [bigBlind, setBigBlind] = useState(100)
  const [blindIncreaseAmount, setBlindIncreaseAmount] = useState(2)
  const [blindIncreaseFrequency, setBlindIncreaseFrequency] = useState(20)
  const [straddlingAllowed, setStraddlingAllowed] = useState(false)
  const [maxPlayers, setMaxPlayers] = useState(8)
  const [customChipBreakdown, setCustomChipBreakdown] = useState(false)
  const [chipBreakdown, setChipBreakdown] = useState({
    chip1: { value: 1, count: 20 },
    chip5: { value: 5, count: 20 },
    chip25: { value: 25, count: 20 },
    chip100: { value: 100, count: 20 },
    chip500: { value: 500, count: 10 }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!gameName.trim()) {
      setError("Game name is required")
      return
    }

    if (bigBlind <= smallBlind) {
      setError("Big blind must be greater than small blind")
      return
    }

    if (startingChips < bigBlind * 10) {
      setError("Starting chips should be at least 10 times the big blind")
      return
    }

    setLoading(true)

    try {
      const gameSettings = {
        startingChips,
        chipBreakdown: customChipBreakdown ? chipBreakdown : null,
        smallBlind,
        bigBlind,
        blindIncreaseAmount,
        blindIncreaseFrequency,
        straddlingAllowed,
        maxPlayers
      }

      const response = await fetch("/api/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "createGame",
          createdBy: player._id,
          creatorUsername: player.username,
          gameName: gameName.trim(),
          invitedPlayers: invitedPlayers.split(',').map(p => p.trim()).filter(p => p),
          numBots: numBots,
          settings: gameSettings
        }),
      })

      const data = await response.json()

      if (response.ok) {
        onGameCreated(data.gameId)
      } else {
        setError(data.error || "Failed to create game")
      }
    } catch (error) {
      setError("Network error occurred")
    } finally {
      setLoading(false)
    }
  }

  const updateChipBreakdown = (chip: keyof typeof chipBreakdown, field: 'value' | 'count', value: number) => {
    setChipBreakdown(prev => ({
      ...prev,
      [chip]: {
        ...prev[chip],
        [field]: value
      }
    }))
  }

  const calculateTotalChipValue = () => {
    return Object.values(chipBreakdown).reduce((total, chip) => {
      return total + (chip.value * chip.count)
    }, 0)
  }

  return (
    <div className="min-h-screen bg-green-900 p-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold text-white">Create New Game</h1>
      </div>

      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Game Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Game Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gameName">Game Name</Label>
                  <Input
                    id="gameName"
                    value={gameName}
                    onChange={(e) => setGameName(e.target.value)}
                    placeholder="Friday Night Poker"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxPlayers">Max Players (2-10)</Label>
                  <Input
                    id="maxPlayers"
                    type="number"
                    min="2"
                    max="10"
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(Number(e.target.value))}
                    disabled={loading}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="invitedPlayers">Invited Players (comma-separated usernames)</Label>
                <Input
                  id="invitedPlayers"
                  value={invitedPlayers}
                  onChange={(e) => setInvitedPlayers(e.target.value)}
                  placeholder="user1, user2, user3"
                  disabled={loading}
                />
                <p className="text-sm text-muted-foreground">
                  Leave empty to make the game open to all players
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="numBots">Number of Bots (0-{maxPlayers - 1})</Label>
                <Input
                  id="numBots"
                  type="number"
                  min="0"
                  max={maxPlayers - 1}
                  value={numBots}
                  onChange={(e) => setNumBots(Number(e.target.value))}
                  placeholder="0"
                  disabled={loading}
                />
                <p className="text-sm text-muted-foreground">
                  Add AI players to fill empty seats (you&apos;ll be added automatically)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Chip Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Chip Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="startingChips">Starting Chips</Label>
                <Input
                  id="startingChips"
                  type="number"
                  min="1000"
                  step="1000"
                  value={startingChips}
                  onChange={(e) => setStartingChips(Number(e.target.value))}
                  disabled={loading}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="customChipBreakdown"
                  checked={customChipBreakdown}
                  onCheckedChange={setCustomChipBreakdown}
                  disabled={loading}
                />
                <Label htmlFor="customChipBreakdown">Custom chip breakdown</Label>
              </div>

              {customChipBreakdown && (
                <div className="space-y-3 p-4 border rounded">
                  <h4 className="font-semibold">Chip Breakdown</h4>
                  {Object.entries(chipBreakdown).map(([key, chip]) => (
                    <div key={key} className="grid grid-cols-3 gap-2 items-center">
                      <Label className="text-sm">Chip {key.slice(-1)}</Label>
                      <div className="space-y-1">
                        <Label className="text-xs">Value</Label>
                        <Input
                          type="number"
                          min="1"
                          value={chip.value}
                          onChange={(e) => updateChipBreakdown(key as keyof typeof chipBreakdown, 'value', Number(e.target.value))}
                          disabled={loading}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Count</Label>
                        <Input
                          type="number"
                          min="0"
                          value={chip.count}
                          onChange={(e) => updateChipBreakdown(key as keyof typeof chipBreakdown, 'count', Number(e.target.value))}
                          disabled={loading}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t text-sm">
                    <strong>Total Value: ${calculateTotalChipValue().toLocaleString()}</strong>
                    {calculateTotalChipValue() !== startingChips && (
                      <p className="text-red-600">
                        Warning: Chip breakdown total (${calculateTotalChipValue().toLocaleString()}) 
                        doesn&apos;t match starting chips (${startingChips.toLocaleString()})
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Blind Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Blind Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smallBlind">Small Blind</Label>
                  <Input
                    id="smallBlind"
                    type="number"
                    min="1"
                    value={smallBlind}
                    onChange={(e) => setSmallBlind(Number(e.target.value))}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bigBlind">Big Blind</Label>
                  <Input
                    id="bigBlind"
                    type="number"
                    min="2"
                    value={bigBlind}
                    onChange={(e) => setBigBlind(Number(e.target.value))}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="blindIncreaseAmount">Blind Increase Multiplier</Label>
                  <Input
                    id="blindIncreaseAmount"
                    type="number"
                    min="1.5"
                    max="5"
                    step="0.5"
                    value={blindIncreaseAmount}
                    onChange={(e) => setBlindIncreaseAmount(Number(e.target.value))}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="blindIncreaseFrequency">Increase Every (hands)</Label>
                  <Input
                    id="blindIncreaseFrequency"
                    type="number"
                    min="5"
                    max="100"
                    value={blindIncreaseFrequency}
                    onChange={(e) => setBlindIncreaseFrequency(Number(e.target.value))}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="straddlingAllowed"
                  checked={straddlingAllowed}
                  onCheckedChange={setStraddlingAllowed}
                  disabled={loading}
                />
                <Label htmlFor="straddlingAllowed">Allow straddling</Label>
              </div>
            </CardContent>
          </Card>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={onBack} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Creating Game..." : "Create Game"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
} 