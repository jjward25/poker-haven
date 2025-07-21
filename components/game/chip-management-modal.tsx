"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, DollarSign, X } from "lucide-react"

interface ChipManagementModalProps {
  gameId: string
  players: any[]
  realDollarMultiplier: number
  onChipsUpdated: () => void
}

export default function ChipManagementModal({
  gameId,
  players,
  realDollarMultiplier,
  onChipsUpdated
}: ChipManagementModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [chipAmounts, setChipAmounts] = useState<{ [playerId: string]: number }>({})

  const calculateRealDollarValue = (chips: number) => {
    return (chips * realDollarMultiplier).toFixed(2)
  }

  const handleChipAmountChange = (playerId: string, amount: number) => {
    setChipAmounts(prev => ({
      ...prev,
      [playerId]: amount
    }))
  }

  const addChipsToPlayer = async (playerId: string) => {
    const amount = chipAmounts[playerId]
    if (!amount || amount <= 0) {
      setError("Please enter a valid chip amount")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "addChipsToPlayer",
          gameId,
          playerId,
          chipAmount: amount
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to add chips")
      }

      // Reset the input for this player
      setChipAmounts(prev => ({
        ...prev,
        [playerId]: 0
      }))

      onChipsUpdated()
      setError("")
    } catch (error: any) {
      console.error("Error adding chips:", error)
      setError(error.message || "Failed to add chips")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        className="flex-shrink-0"
        onClick={() => setOpen(true)}
      >
        <DollarSign className="w-4 h-4 mr-1 sm:mr-2" />
        <span className="hidden sm:inline">Manage Chips</span>
        <span className="sm:hidden">Chips</span>
      </Button>

      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Manage Player Chips
              </h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Real Dollar Multiplier: {realDollarMultiplier}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {players.map((player) => (
                <Card key={player.playerId} className="p-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold">{player.username}</h4>
                        <p className="text-sm text-muted-foreground">
                          Current: {player.chips.toLocaleString()} chips (${calculateRealDollarValue(player.chips)})
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label htmlFor={`chips-${player.playerId}`} className="text-xs">
                          Add Chips
                        </Label>
                        <Input
                          id={`chips-${player.playerId}`}
                          type="number"
                          min="1"
                          value={chipAmounts[player.playerId] || ""}
                          onChange={(e) => handleChipAmountChange(player.playerId, Number(e.target.value))}
                          placeholder="0"
                          disabled={loading}
                        />
                        {chipAmounts[player.playerId] > 0 && (
                          <p className="text-xs text-green-600 mt-1">
                            +${calculateRealDollarValue(chipAmounts[player.playerId])} real value
                          </p>
                        )}
                      </div>
                      <Button
                        onClick={() => addChipsToPlayer(player.playerId)}
                        disabled={loading || !chipAmounts[player.playerId] || chipAmounts[player.playerId] <= 0}
                        size="sm"
                        className="mt-5"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
} 