"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import PlayingCard from "@/components/playing-card"

interface Player {
  playerId: string
  username: string
  chips: number
  seatNumber: number
  isReady: boolean
  cards: string[]
  currentBet: number
  folded: boolean
  allIn: boolean
  isDealer: boolean
  isSmallBlind: boolean
  isBigBlind: boolean
  hasActed: boolean
  isBot?: boolean
  joinedAt: string
}

interface PokerTableLayoutProps {
  players: Player[]
  currentPlayer: { _id: string; username: string }
  gamePhase: string
  communityCards: string[]
  pot: number
  maxPlayers: number
  gameStatus: string
  isGameCreator: boolean
  currentPlayerTurn: number
  onSeatSelect?: (seatNumber: number) => void
  canChangeSeat: boolean
}

export default function PokerTableLayout({
  players,
  currentPlayer,
  gamePhase,
  communityCards,
  pot,
  maxPlayers,
  gameStatus,
  isGameCreator,
  currentPlayerTurn,
  onSeatSelect,
  canChangeSeat
}: PokerTableLayoutProps) {
  // Create array of 8 seats
  const seats = Array.from({ length: 8 }, (_, index) => {
    const player = players.find(p => p.seatNumber === index)
    return {
      seatNumber: index,
      player: player || null,
      isOccupied: !!player
    }
  })

  // Position seats around oval table with proper oval spacing
  const getSeatPosition = (seatNumber: number) => {
    const positions = [
      { top: '2%', left: '50%', transform: 'translateX(-50%)' }, // 0 - top center
      { top: '8%', right: '15%' }, // 1 - top right (moved up and inward)
      { top: '50%', right: '3%', transform: 'translateY(-50%)' }, // 2 - right center
      { bottom: '8%', right: '15%' }, // 3 - bottom right (moved down and inward)
      { bottom: '2%', left: '50%', transform: 'translateX(-50%)' }, // 4 - bottom center
      { bottom: '8%', left: '15%' }, // 5 - bottom left (moved down and inward)
      { top: '50%', left: '3%', transform: 'translateY(-50%)' }, // 6 - left center
      { top: '8%', left: '15%' }, // 7 - top left (moved up and inward)
    ]
    return positions[seatNumber] || positions[0]
  }

  const handleSeatClick = (seatNumber: number) => {
    if (canChangeSeat && onSeatSelect && !seats[seatNumber].isOccupied) {
      onSeatSelect(seatNumber)
    }
  }

  const isCurrentPlayerSeat = (seat: { player: Player | null }) => {
    return seat.player?.playerId === currentPlayer._id
  }

  const isCurrentPlayerTurnSeat = (seatNumber: number) => {
    // Get the player at this seat
    const playerAtSeat = players.find(p => p.seatNumber === seatNumber)
    if (!playerAtSeat) return false
    
    // Check if this player is at the current turn position
    const sortedPlayers = [...players].sort((a, b) => a.seatNumber - b.seatNumber)
    const currentTurnPlayer = sortedPlayers[currentPlayerTurn]
    
    return currentTurnPlayer?.playerId === playerAtSeat.playerId
  }

  return (
    <div className="relative w-full max-w-6xl mx-auto h-[600px] bg-green-800 rounded-full border-8 border-amber-700 shadow-2xl">
      {/* Table felt pattern */}
      <div className="absolute inset-8 bg-green-700 rounded-full opacity-80"></div>
      
      {/* Community Cards Area */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
        <div className="mb-2">
          <h3 className="text-lg font-bold text-white">Pot: ${pot.toLocaleString()}</h3>
        </div>
        <div className="flex justify-center gap-1">
          {communityCards.map((card, i) => (
            <PlayingCard key={i} card={card} small />
          ))}
          {Array.from({ length: 5 - communityCards.length }).map((_, i) => (
            <div key={i} className="w-12 h-16 bg-gray-700 rounded border-2 border-dashed border-gray-500" />
          ))}
        </div>
      </div>

      {/* Player Seats */}
      {seats.map((seat) => (
        <div
          key={seat.seatNumber}
          className="absolute"
          style={getSeatPosition(seat.seatNumber)}
        >
          {seat.isOccupied && seat.player ? (
            <Card 
              className={`w-36 transition-all duration-200 ${
                isCurrentPlayerSeat(seat) ? 'ring-4 ring-blue-400 bg-blue-50' : ''
              } ${
                isCurrentPlayerTurnSeat(seat.seatNumber) && gamePhase !== 'showdown' 
                  ? 'ring-4 ring-yellow-400 bg-yellow-50' : ''
              } ${
                seat.player.folded ? 'opacity-50' : ''
              }`}
            >
              <CardContent className="p-3">
                <div className="text-center">
                  {/* Player badges */}
                  <div className="flex justify-center gap-1 mb-1">
                    {seat.player.isDealer && <Badge variant="outline" className="text-xs">D</Badge>}
                    {seat.player.isSmallBlind && <Badge variant="outline" className="text-xs">SB</Badge>}
                    {seat.player.isBigBlind && <Badge variant="outline" className="text-xs">BB</Badge>}
                    {seat.player.isBot && <Badge variant="secondary" className="text-xs bg-blue-600">BOT</Badge>}
                  </div>

                  {/* Player name and chips */}
                  <h4 className={`font-semibold text-sm ${
                    isCurrentPlayerSeat(seat) ? 'text-blue-600 font-bold' : ''
                  }`}>
                    {seat.player.username}
                    {isCurrentPlayerSeat(seat) && ' (You)'}
                  </h4>
                  <p className="text-xs text-muted-foreground">${seat.player.chips.toLocaleString()}</p>

                  {/* Current bet */}
                  {seat.player.currentBet > 0 && (
                    <p className="text-xs font-medium text-green-600">
                      Bet: ${seat.player.currentBet}
                    </p>
                  )}

                  {/* Status badges */}
                  {seat.player.folded && <Badge variant="destructive" className="text-xs">Folded</Badge>}
                  {seat.player.allIn && <Badge variant="secondary" className="text-xs">All In</Badge>}

                                    {/* Player cards - only show for current player or during showdown */}
                  {seat.player.playerId === currentPlayer._id && seat.player.cards.length > 0 && (
                    <div className="flex justify-center gap-1 mt-1">
                      {seat.player.cards.map((card, cardIndex) => (
                        <PlayingCard key={cardIndex} card={card} small />
                      ))}
                    </div>
                  )}
                  
                  {/* Show other players' cards only during showdown */}
                  {seat.player.playerId !== currentPlayer._id && gamePhase === "showdown" && !seat.player.folded && seat.player.cards.length > 0 && (
                    <div className="flex justify-center gap-1 mt-1">
                      {seat.player.cards.map((card, cardIndex) => (
                        <PlayingCard key={cardIndex} card={card} small />
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            // Empty seat
            <Button
              variant="outline"
              className={`w-36 h-24 border-dashed border-2 ${
                canChangeSeat ? 'hover:bg-green-600 cursor-pointer' : 'cursor-default opacity-50'
              }`}
              onClick={() => handleSeatClick(seat.seatNumber)}
              disabled={!canChangeSeat}
            >
              <div className="text-center">
                <div className="text-sm font-medium">Seat {seat.seatNumber + 1}</div>
                {canChangeSeat && <div className="text-xs text-muted-foreground">Click to sit</div>}
              </div>
            </Button>
          )}
        </div>
      ))}
    </div>
  )
} 