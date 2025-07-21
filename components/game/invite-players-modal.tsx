"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { UserPlus, Send, X } from "lucide-react"

interface Player {
  _id: string
  username: string
}

interface InvitePlayersModalProps {
  gameId: string
  currentPlayers: Array<{ username: string; playerId: string }>
  maxPlayers: number
  onInviteSent: () => void
}

export default function InvitePlayersModal({ 
  gameId, 
  currentPlayers, 
  maxPlayers, 
  onInviteSent 
}: InvitePlayersModalProps) {
  const [open, setOpen] = useState(false)
  const [inviteUsername, setInviteUsername] = useState("")
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    if (open) {
      fetchAvailablePlayers()
    }
  }, [open])

  const fetchAvailablePlayers = async () => {
    try {
      const response = await fetch("/api/players")
      const data = await response.json()

      if (response.ok) {
        // Filter out players already in the game
        const currentPlayerIds = currentPlayers.map(p => p.playerId)
        const available = data.filter((player: Player) => 
          !currentPlayerIds.includes(player._id) && !player.username.startsWith('Bot ')
        )
        setAvailablePlayers(available)
      }
    } catch (error) {
      console.error("Failed to fetch players")
    }
  }

  const sendInvite = async (username: string) => {
    if (!username.trim()) return

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "invitePlayer",
          gameId: gameId,
          username: username.trim()
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(`Invitation sent to ${username}!`)
        setInviteUsername("")
        onInviteSent()
        
        // Auto-close modal after 2 seconds
        setTimeout(() => {
          setOpen(false)
          setSuccess("")
        }, 2000)
      } else {
        setError(data.error || "Failed to send invitation")
      }
    } catch (error) {
      setError("Network error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendInvite(inviteUsername)
  }

  const canInviteMore = currentPlayers.length < maxPlayers

  return (
    <>
      <Button 
        variant="outline" 
        size="sm"
        disabled={!canInviteMore}
        onClick={() => setOpen(true)}
      >
        <UserPlus className="w-4 h-4 mr-2" />
        Invite Players
      </Button>

      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Invite Players to Game
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
                Current players: {currentPlayers.length}/{maxPlayers}
              </div>

              {!canInviteMore && (
                <Alert>
                  <AlertDescription>
                    Game is full! No more players can be invited.
                  </AlertDescription>
                </Alert>
              )}

              {canInviteMore && (
                <>
                  <form onSubmit={handleInviteSubmit} className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="inviteUsername">Username</Label>
                      <div className="flex gap-2">
                        <Input
                          id="inviteUsername"
                          value={inviteUsername}
                          onChange={(e) => setInviteUsername(e.target.value)}
                          placeholder="Enter username to invite"
                          disabled={loading}
                        />
                        <Button 
                          type="submit" 
                          size="sm"
                          disabled={loading || !inviteUsername.trim()}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </form>

                  {availablePlayers.length > 0 && (
                    <div className="space-y-2">
                      <Label>Available Players</Label>
                      <div className="max-h-32 overflow-y-auto space-y-1 border rounded p-2">
                        {availablePlayers.slice(0, 10).map((player) => (
                          <div 
                            key={player._id} 
                            className="flex items-center justify-between text-sm"
                          >
                            <span>{player.username}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => sendInvite(player.username)}
                              disabled={loading}
                            >
                              Invite
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-green-500 text-green-700">
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
} 