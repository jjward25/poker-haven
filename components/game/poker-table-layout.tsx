"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import PlayingCard from "@/components/playing-card"

// Mobile Player Card Component
function MobilePlayerCard({ seat, isCurrentPlayer, isCurrentTurn, showChips, onTap }: {
  seat: any
  isCurrentPlayer: boolean
  isCurrentTurn: boolean
  showChips: boolean
  onTap: () => void
}) {
  return (
    <Card 
      className={`transition-all duration-200 cursor-pointer ${
        isCurrentPlayer ? 'ring-2 ring-blue-400 bg-blue-50' : ''
      } ${
        isCurrentTurn ? 'ring-2 ring-yellow-400 bg-yellow-50' : ''
      } ${
        seat.player.folded ? 'opacity-50' : ''
      }`}
      onClick={onTap}
    >
      <CardContent className="p-2">
        <div className="text-center">
          {/* Player badges */}
          <div className="flex justify-center gap-0.5 mb-1 flex-wrap">
            {seat.player.isDealer && <Badge variant="outline" className="text-xs px-1">D</Badge>}
            {seat.player.isSmallBlind && <Badge variant="outline" className="text-xs px-1">SB</Badge>}
            {seat.player.isBigBlind && <Badge variant="outline" className="text-xs px-1">BB</Badge>}
          </div>

          {/* Player name */}
          <h4 className={`font-semibold text-sm leading-tight ${
            isCurrentPlayer ? 'text-blue-600 font-bold' : ''
          }`}>
            {seat.player.username.length > 12 ? seat.player.username.substring(0, 12) + '...' : seat.player.username}
            {isCurrentPlayer && ' (You)'}
          </h4>

          {/* Chips - show when tapped */}
          {showChips && (
            <p className="text-sm text-muted-foreground mt-1">
              ${seat.player.chips.toLocaleString()}
            </p>
          )}

          {/* Current bet - always show */}
          {seat.player.currentBet > 0 && (
            <p className="text-sm font-medium text-green-600 mt-1">
              ${seat.player.currentBet}
            </p>
          )}

          {/* Status badges */}
          <div className="flex justify-center gap-1 mt-1">
            {seat.player.folded && <Badge variant="destructive" className="text-xs px-1">FOLDED</Badge>}
            {seat.player.allIn && showChips && (
              <Badge variant="secondary" className="text-xs px-1">All In</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Mobile Empty Seat Component
function MobileEmptySeat({ seatNumber, canChangeSeat, onSeatClick }: {
  seatNumber: number
  canChangeSeat: boolean
  onSeatClick: (seatNumber: number) => void
}) {
  return (
    <Button
      variant="outline"
      className={`w-full h-20 border-dashed border-2 ${
        canChangeSeat ? 'hover:bg-green-600 cursor-pointer' : 'cursor-default opacity-50'
      }`}
      onClick={() => onSeatClick(seatNumber)}
      disabled={!canChangeSeat}
    >
      <div className="text-center">
        <div className="text-sm font-medium">Seat {seatNumber + 1}</div>
        {canChangeSeat && <div className="text-xs text-muted-foreground">Tap to sit</div>}
      </div>
    </Button>
  )
}

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
  // State for mobile chip display
  const [showChipsForPlayer, setShowChipsForPlayer] = useState<string | null>(null)

  // Handle mobile player tap
  const handleMobilePlayerTap = (playerId: string) => {
    setShowChipsForPlayer(showChipsForPlayer === playerId ? null : playerId)
  }

  // Create array of 8 seats
  const seats = Array.from({ length: 8 }, (_, index) => {
    const player = players.find(p => p.seatNumber === index)
    return {
      seatNumber: index,
      isOccupied: !!player,
      player: player || null
    }
  })

  // Helper functions
  const isCurrentPlayerSeat = (seat: any) => {
    return seat.player && seat.player.playerId === currentPlayer._id
  }

  const isCurrentPlayerTurnSeat = (seatNumber: number) => {
    return currentPlayerTurn === seatNumber
  }

  const handleSeatClick = (seatNumber: number) => {
    if (onSeatSelect && canChangeSeat) {
      onSeatSelect(seatNumber)
    }
  }

  // Seat positions for desktop oval layout
  const getSeatPosition = (seatNumber: number) => {
    const positions = [
      { top: '2%', left: '50%', transform: 'translateX(-50%)' }, // 0 - top center
      { top: '8%', right: '15%' }, // 1 - top right
      { top: '50%', right: '3%', transform: 'translateY(-50%)' }, // 2 - right center
      { bottom: '8%', right: '15%' }, // 3 - bottom right
      { bottom: '2%', left: '50%', transform: 'translateX(-50%)' }, // 4 - bottom center
      { bottom: '8%', left: '15%' }, // 5 - bottom left
      { top: '50%', left: '3%', transform: 'translateY(-50%)' }, // 6 - left center
      { top: '8%', left: '15%' }, // 7 - top left
    ]
    return positions[seatNumber] || positions[0]
  }

  return (
    <>
      {/* Mobile Layout: Linear arrangement */}
      <div className="block sm:hidden space-y-4">
        {/* Seats 1-4 (Top Row) */}
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((seatIndex) => {
            const seat = seats[seatIndex]
            return (
              <div key={seat.seatNumber}>
                {seat.isOccupied && seat.player ? (
                  <MobilePlayerCard 
                    seat={seat}
                    isCurrentPlayer={isCurrentPlayerSeat(seat)}
                    isCurrentTurn={isCurrentPlayerTurnSeat(seat.seatNumber) && gamePhase !== 'showdown'}
                    showChips={showChipsForPlayer === seat.player.playerId}
                    onTap={() => seat.player && handleMobilePlayerTap(seat.player.playerId)}
                  />
                ) : (
                  <MobileEmptySeat 
                    seatNumber={seat.seatNumber}
                    canChangeSeat={canChangeSeat}
                    onSeatClick={handleSeatClick}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Community Cards & Pot */}
        <div className="bg-green-800 rounded-lg border-2 border-amber-700 p-4">
          <div className="text-center">
            <div className="mb-2">
              <h3 className="text-lg font-bold text-white">Pot: ${pot.toLocaleString()}</h3>
            </div>
            <div className="flex justify-center gap-1 flex-wrap">
              {communityCards.map((card, i) => (
                <PlayingCard key={i} card={card} small />
              ))}
              {Array.from({ length: 5 - communityCards.length }).map((_, i) => (
                <div key={i} className="w-10 h-14 bg-gray-700 rounded border-2 border-dashed border-gray-500" />
              ))}
            </div>
          </div>
        </div>

        {/* Seats 5-8 (Bottom Row) */}
        <div className="grid grid-cols-2 gap-2">
          {[4, 5, 6, 7].map((seatIndex) => {
            const seat = seats[seatIndex]
            return (
              <div key={seat.seatNumber}>
                {seat.isOccupied && seat.player ? (
                  <MobilePlayerCard 
                    seat={seat}
                    isCurrentPlayer={isCurrentPlayerSeat(seat)}
                    isCurrentTurn={isCurrentPlayerTurnSeat(seat.seatNumber) && gamePhase !== 'showdown'}
                    showChips={showChipsForPlayer === seat.player.playerId}
                    onTap={() => seat.player && handleMobilePlayerTap(seat.player.playerId)}
                  />
                ) : (
                  <MobileEmptySeat 
                    seatNumber={seat.seatNumber}
                    canChangeSeat={canChangeSeat}
                    onSeatClick={handleSeatClick}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Desktop Layout: Oval table */}
      <div className="hidden sm:block relative w-full max-w-6xl mx-auto h-[600px] bg-green-800 rounded-full border-8 border-amber-700 shadow-2xl">
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
                    <div className="flex justify-center gap-1 mb-1 flex-wrap">
                      {seat.player.isDealer && <Badge variant="outline" className="text-xs">D</Badge>}
                      {seat.player.isSmallBlind && <Badge variant="outline" className="text-xs">SB</Badge>}
                      {seat.player.isBigBlind && <Badge variant="outline" className="text-xs">BB</Badge>}
                      {seat.player.isBot && <Badge variant="secondary" className="text-xs bg-blue-600">BOT</Badge>}
                    </div>

                    {/* Player name */}
                    <h4 className={`font-semibold text-sm ${
                      isCurrentPlayerSeat(seat) ? 'text-blue-600 font-bold' : ''
                    }`}>
                      {seat.player.username.length > 8 ? seat.player.username.substring(0, 8) + '...' : seat.player.username}
                      {isCurrentPlayerSeat(seat) && <span> (You)</span>}
                    </h4>

                    {/* Chips - always show on desktop */}
                    <p className="text-xs text-muted-foreground">
                      ${seat.player.chips.toLocaleString()}
                    </p>

                    {/* Current bet - always show */}
                    {seat.player.currentBet > 0 && (
                      <p className="text-xs font-medium text-green-600">
                        Bet: ${seat.player.currentBet}
                      </p>
                    )}

                    {/* Status badges */}
                    <div className="flex justify-center gap-1 mt-1">
                      {seat.player.folded && <Badge variant="destructive" className="text-xs">Folded</Badge>}
                      {seat.player.allIn && <Badge variant="secondary" className="text-xs">All In</Badge>}
                    </div>

                    {/* Player cards - only show for current player or during showdown */}
                    {seat.player.playerId === currentPlayer._id && seat.player.cards.length > 0 && (
                      <div className="flex justify-center gap-1 mt-1">
                        {seat.player.cards.map((card: string, i: number) => (
                          <PlayingCard key={i} card={card} small />
                        ))}
                      </div>
                    )}

                    {gamePhase === 'showdown' && seat.player.cards.length > 0 && !seat.player.folded && (
                      <div className="flex justify-center gap-1 mt-1">
                        {seat.player.cards.map((card: string, i: number) => (
                          <PlayingCard key={i} card={card} small />
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
    </>
  )
} 