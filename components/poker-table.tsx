"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Users, DollarSign, Clock, Pause, Play } from "lucide-react"
// import PlayingCard from "@/components/playing-card"
import InvitePlayersModal from "@/components/game/invite-players-modal"
import GameChat from "@/components/game/game-chat"
import PokerTableLayout from "@/components/game/poker-table-layout"
import CurrentPlayerCards from "@/components/game/current-player-cards"
import { createDeck, shuffleDeck, dealCards, evaluateHand, compareHands } from "@/lib/poker-utils"

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

interface GameState {
  deck: string[]
  communityCards: string[]
  pot: number
  currentPlayer: number
  gamePhase: "preflop" | "flop" | "turn" | "river" | "showdown"
  dealerPosition: number
  smallBlindPosition: number
  bigBlindPosition: number
}

interface Game {
  _id: string
  gameName: string
  status: string
  createdBy: string
  players: Player[]
  gameState: GameState
  settings: {
    startingChips: number
    smallBlind: number
    bigBlind: number
    blindIncreaseAmount: number
    blindIncreaseFrequency: number
    straddlingAllowed: boolean
    maxPlayers: number
  }
  currentHand: number
}

interface CurrentPlayer {
  _id: string
  username: string
}

interface PokerTableProps {
  gameId: string
  currentPlayer: CurrentPlayer
  onBackToSetup: () => void
  onBackToDashboard: () => void
}

export default function PokerTable({ gameId, currentPlayer, onBackToDashboard }: PokerTableProps) {
  const [game, setGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [betAmount, setBetAmount] = useState(100)
  const [winner, setWinner] = useState("")

  // Fetch game data
  useEffect(() => {
    fetchGame()
    const interval = setInterval(fetchGame, 2000) // Poll for updates every 2 seconds
    return () => clearInterval(interval)
  }, [gameId])

  // Evaluate hand strength for bot decisions (more generous ratings)
  const evaluateBotHandStrength = (cards: string[]) => {
    if (!cards || cards.length < 2) return 0

    // Convert cards to ranks for evaluation
    const cardRanks = cards.map(card => {
      const rank = card.slice(0, -1)
      const rankValues: { [key: string]: number } = {
        '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
      }
      return rankValues[rank] || 0
    })

    const [rank1, rank2] = cardRanks
    const suited = cards[0].slice(-1) === cards[1].slice(-1)

    // High pairs
    if (rank1 === rank2) {
      if (rank1 >= 11) return 0.95 // JJ, QQ, KK, AA - premium
      if (rank1 >= 8) return 0.8 // 88, 99, 10-10 - strong
      if (rank1 >= 5) return 0.6 // 55, 66, 77 - decent
      return 0.4 // Lower pairs still playable
    }

    // High cards (more generous)
    if (rank1 >= 11 || rank2 >= 11) { // Jack, Queen, King or Ace
      if ((rank1 >= 13 && rank2 >= 10) || (rank2 >= 13 && rank1 >= 10)) {
        return suited ? 0.85 : 0.7 // AK, AQ, AJ, KQ, KJ suited/unsuited
      }
      if ((rank1 >= 11 && rank2 >= 8) || (rank2 >= 11 && rank1 >= 8)) {
        return suited ? 0.6 : 0.45 // Face card with 8+ 
      }
      return suited ? 0.5 : 0.35 // Any face card
    }

    // Suited hands (more valuable)
    if (suited) {
      if (Math.abs(rank1 - rank2) <= 1) return 0.5 // Suited connectors
      if (Math.abs(rank1 - rank2) <= 3) return 0.4 // Suited gaps
      return 0.3 // Any suited
    }

    // Connected cards
    if (Math.abs(rank1 - rank2) <= 1 && Math.max(rank1, rank2) >= 8) return 0.35

    // High single cards
    if (Math.max(rank1, rank2) >= 10) return 0.25 // 10+ high

    return 0.15 // Still some bluff potential
  }

  // Handle bot actions
  useEffect(() => {
    if (!game || game.status === 'paused' || game.gameState.gamePhase === 'showdown') return
    
    const currentPlayerData = game.players[game.gameState.currentPlayer]
    if (currentPlayerData?.isBot && game.status === 'active') {
      const handStrength = evaluateBotHandStrength(currentPlayerData.cards)
      const maxBet = Math.max(...game.players.map((p) => p.currentBet))
      const canCall = currentPlayerData.currentBet < maxBet && currentPlayerData.chips > 0
      const callAmount = maxBet - currentPlayerData.currentBet
      const potOdds = callAmount / (game.gameState.pot + callAmount)
      
            // Aggressive bot decision making with positional awareness
      let action = 'fold'
      
      // Add some random aggression factor (some bots are naturally more aggressive)
      const aggression = 1.0 + Math.random() * 0.6 // 1.0 to 1.6 aggression multiplier - much more aggressive!
      
      // Check position-specific situations
      const isSmallBlind = currentPlayerData.isSmallBlind
      const isBigBlind = currentPlayerData.isBigBlind
      const activePlayers = game.players.filter(p => !p.folded && !p.allIn)
      const isHeadsUpSB = isSmallBlind && activePlayers.length === 2 && maxBet === game.settings.bigBlind
      const isBBOption = isBigBlind && game.gameState.gamePhase === "preflop" && maxBet === game.settings.bigBlind
      
      if (handStrength >= 0.8) {
        // Premium hands - always play, very often raise
        action = Math.random() < 0.25 ? 'call' : 'raise'  // 75% raise rate!
      } else if (handStrength >= 0.6) {
        // Strong hands - almost always play, often raise
        action = Math.random() < (0.9 * aggression) ? 'call' : 'fold'
        if (action === 'call' && Math.random() < 0.5) action = 'raise'  // 50% raise rate
      } else if (handStrength >= 0.4) {
        // Decent hands - usually play, sometimes raise
        action = Math.random() < (0.8 * aggression) ? 'call' : 'fold'
        if (action === 'call' && Math.random() < 0.35) action = 'raise'  // 35% raise rate
      } else if (handStrength >= 0.25) {
        // Marginal hands - often play, occasionally raise as bluff
        if (potOdds < 0.5) { // Good pot odds
          action = Math.random() < (0.7 * aggression) ? 'call' : 'fold'
        } else {
          action = Math.random() < (0.5 * aggression) ? 'call' : 'fold'
        }
        if (action === 'call' && Math.random() < 0.15) action = 'raise'  // 15% bluff raise
      } else if (handStrength >= 0.15) {
        // Weak hands - sometimes play, sometimes bluff
        if (!canCall) {
          action = 'check'
          if (Math.random() < 0.1) action = 'raise' // 10% bluff from check
        } else if (potOdds < 0.3) {
          action = Math.random() < (0.45 * aggression) ? 'call' : 'fold'
        } else {
          action = Math.random() < (0.25 * aggression) ? 'call' : 'fold'
        }
        if (action === 'call' && Math.random() < 0.1) action = 'raise'  // 10% bluff raise
      } else {
        // Very weak hands - check if free, occasionally bluff big
        if (!canCall) {
          action = 'check'
          if (Math.random() < 0.05) action = 'raise' // 5% pure bluff
        } else {
          action = Math.random() < (0.15 * aggression) ? 'call' : 'fold'
          if (action === 'call' && Math.random() < 0.05) action = 'raise'  // 5% crazy bluff
        }
      }

             // If no bet to call, prefer checking over folding
      if (!canCall && (action === 'call' || action === 'fold')) {
        action = 'check'
      }

      // Handle facing raises - don't just fold everything!
      if (canCall && callAmount > game.settings.bigBlind) {
        // Someone raised - need different logic to not be a complete nit
        const raiseSize = callAmount / game.gameState.pot
        
        if (handStrength >= 0.7) {
          // Strong hands vs raises - often call, sometimes 3-bet
          action = Math.random() < 0.85 ? 'call' : 'fold'
          if (action === 'call' && Math.random() < 0.4) action = 'raise'
        } else if (handStrength >= 0.5) {
          // Decent hands vs raises - call based on raise size
          if (raiseSize < 0.5) { // Small raise
            action = Math.random() < 0.7 ? 'call' : 'fold'
          } else { // Big raise
            action = Math.random() < 0.5 ? 'call' : 'fold'
          }
          if (action === 'call' && Math.random() < 0.2) action = 'raise'
        } else if (handStrength >= 0.3) {
          // Marginal hands vs raises - sometimes defend
          if (raiseSize < 0.3) { // Very small raise
            action = Math.random() < 0.5 ? 'call' : 'fold'
          } else {
            action = Math.random() < 0.25 ? 'call' : 'fold'
          }
        } else {
          // Weak hands vs raises - occasionally bluff call/3bet
          if (Math.random() < 0.1) {
            action = Math.random() < 0.7 ? 'call' : 'raise' // 10% bluff defense
          } else {
            action = 'fold'
          }
        }
      }

      // Add some random bluffing/aggression regardless of hand strength
      if (action === 'call' && Math.random() < 0.2) {
        action = 'raise' // 20% chance to turn call into raise (bluff/value) - increased!
      }
      
      // Small blind heads-up adjustment - much more aggressive
      if (isHeadsUpSB && action === 'fold') {
        // Small blind should defend very wide vs big blind
        if (handStrength >= 0.3) {
          action = 'call' // Call with 30%+ hands
        } else if (handStrength >= 0.2) {
          action = Math.random() < 0.7 ? 'call' : 'fold' // 70% call rate with marginal hands
        } else if (handStrength >= 0.15) {
          action = Math.random() < 0.5 ? 'call' : 'fold' // 50% call rate with weak hands
        } else {
          action = Math.random() < 0.2 ? 'call' : 'fold' // 20% call rate with trash
        }
        
        // Small blind can also raise with strong hands heads up
        if (action === 'call' && handStrength >= 0.6 && Math.random() < 0.4) {
          action = 'raise'
        }
             }

      // Big blind option - more aggressive when exercising BB option in preflop
      if (isBBOption && action === 'check') {
        // Big blind should sometimes raise with decent hands when they get their option
        if (handStrength >= 0.5 && Math.random() < 0.3) {
          action = 'raise' // 30% chance to raise with decent+ hands
        } else if (handStrength >= 0.4 && Math.random() < 0.15) {
          action = 'raise' // 15% chance to raise with marginal hands
        }
      }

      // Occasionally make loose calls for action - increased for more aggression
      if (action === 'fold' && canCall && !isHeadsUpSB && Math.random() < 0.2) {
        action = 'call' // 20% chance to call anyway (loose aggressive play)
      }
      
      // Pure bluff raises from nowhere 
      if (action === 'fold' && canCall && Math.random() < 0.05) {
        action = 'raise' // 5% chance to just bluff raise with anything
      }
      
      setTimeout(() => {
        if (action === 'call' && canCall) {
          botCall(currentPlayerData)
        } else if (action === 'raise' && canCall && currentPlayerData.chips > callAmount) {
          botRaise(currentPlayerData)
        } else if (action === 'check' && !canCall) {
          botCheck(currentPlayerData)
        } else {
          botFold(currentPlayerData)
        }
      }, 1500) // Add delay to make it feel more natural
    }
  }, [game?.gameState.currentPlayer, game?.status])

  const fetchGame = async () => {
    try {
      const response = await fetch(`/api/games?gameId=${gameId}`)
      const data = await response.json()

      if (response.ok) {
        setGame(data)
        setError("")
      } else {
        setError(data.error || "Failed to fetch game")
      }
    } catch (error) {
      setError("Network error occurred")
    } finally {
      setLoading(false)
    }
  }

  const updateGameState = async (newGameState: Partial<GameState>) => {
    if (!game) return

    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "updateGameState",
          gameId: game._id,
          gameState: { ...game.gameState, ...newGameState }
        }),
      })

      if (response.ok) {
        fetchGame() // Refresh game state
      } else {
        const data = await response.json()
        setError(data.error || "Failed to update game")
      }
    } catch (error) {
      setError("Network error occurred")
    }
  }

  // Start new hand (only game creator can do this)
  const startNewHand = async () => {
    if (!game || game.createdBy !== currentPlayer._id) return

    const newDeck = shuffleDeck(createDeck())

    // Deal cards to players
    const activePlayers = game.players.filter(p => !p.folded)
    const { players: playersWithCards, remainingDeck } = dealCards(activePlayers, newDeck)

    // Update players with new cards and reset states
    const updatedPlayers = game.players.map((player) => {
      const playerWithCards = playersWithCards.find(p => p.playerId === player.playerId)
      return {
      ...player,
        cards: playerWithCards ? playerWithCards.cards : [],
      currentBet: 0,
      folded: false,
      allIn: false,
      hasActed: false,
        isDealer: false,
        isSmallBlind: false,
        isBigBlind: false
      }
    })

    // Get sorted players by seat number for proper rotation
    const sortedPlayers = [...game.players].sort((a, b) => a.seatNumber - b.seatNumber)
    
    // Find current dealer position in sorted order
    let currentDealerIndex = sortedPlayers.findIndex(p => p.isDealer)
    if (currentDealerIndex === -1) currentDealerIndex = 0 // First hand
    
    // Rotate dealer position
    const newDealerIndex = (currentDealerIndex + 1) % sortedPlayers.length
    const newSmallBlindIndex = (newDealerIndex + 1) % sortedPlayers.length
    const newBigBlindIndex = (newDealerIndex + 2) % sortedPlayers.length

    // Update dealer, blinds based on seat positions
    const dealerPlayer = sortedPlayers[newDealerIndex]
    const sbPlayer = sortedPlayers[newSmallBlindIndex]
    const bbPlayer = sortedPlayers[newBigBlindIndex]

    // Reset all positions and set new ones
    updatedPlayers.forEach(player => {
      player.isDealer = player.playerId === dealerPlayer.playerId
      player.isSmallBlind = player.playerId === sbPlayer.playerId
      player.isBigBlind = player.playerId === bbPlayer.playerId
    })

    // Post blinds
    const sbPlayerIndex = updatedPlayers.findIndex(p => p.playerId === sbPlayer.playerId)
    const bbPlayerIndex = updatedPlayers.findIndex(p => p.playerId === bbPlayer.playerId)
    
    updatedPlayers[sbPlayerIndex].currentBet = game.settings.smallBlind
    updatedPlayers[sbPlayerIndex].chips -= game.settings.smallBlind
    updatedPlayers[bbPlayerIndex].currentBet = game.settings.bigBlind
    updatedPlayers[bbPlayerIndex].chips -= game.settings.bigBlind

    const newGameState: GameState = {
      deck: remainingDeck,
      communityCards: [],
      pot: game.settings.smallBlind + game.settings.bigBlind,
      currentPlayer: (newBigBlindIndex + 1) % sortedPlayers.length,
      gamePhase: "preflop",
      dealerPosition: newDealerIndex,
      smallBlindPosition: newSmallBlindIndex,
      bigBlindPosition: newBigBlindIndex
    }

    // Update game in database
    try {
      await fetch("/api/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "updateGameState",
          gameId: game._id,
          gameState: newGameState
        }),
      })

      // Also update players
      await fetch("/api/games", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameId: game._id,
          gameData: { 
            players: updatedPlayers,
            status: 'active',
            currentHand: game.currentHand + 1
          }
        }),
      })

      setWinner("")
      fetchGame()
    } catch (error) {
      setError("Failed to start new hand")
    }
  }

  // Get current player data
  const getCurrentPlayerData = () => {
    if (!game) return null
    return game.players.find(p => p.playerId === currentPlayer._id)
  }

  // Check if cards have been dealt to any player
  const hasCardsBeenDealt = game?.players.some(player => player.cards && player.cards.length > 0) || false

  // Player actions
  const fold = async () => {
    const playerData = getCurrentPlayerData()
    if (!playerData || !game) return

    const updatedPlayers = game.players.map((player) =>
      player.playerId === currentPlayer._id 
        ? { ...player, folded: true, hasActed: true }
        : player
    )

    await fetch("/api/games", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gameId: game._id,
        gameData: { players: updatedPlayers }
      }),
    })

    // Check if only one player remains after this fold
    const activePlayers = updatedPlayers.filter((p) => !p.folded && !p.allIn)
    if (activePlayers.length <= 1) {
      await determineWinner()
      return
    }

    await nextPlayer()
  }

  const call = async () => {
    const playerData = getCurrentPlayerData()
    if (!playerData || !game) return

    const maxBet = Math.max(...game.players.map((p) => p.currentBet))
    const callAmount = Math.min(maxBet - playerData.currentBet, playerData.chips)

    const updatedPlayers = game.players.map((player) =>
      player.playerId === currentPlayer._id
        ? {
            ...player,
            currentBet: player.currentBet + callAmount,
            chips: player.chips - callAmount,
            allIn: player.chips - callAmount === 0,
              hasActed: true,
            }
        : player
    )

    await fetch("/api/games", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gameId: game._id,
        gameData: { players: updatedPlayers }
      }),
    })

    await updateGameState({ pot: game.gameState.pot + callAmount })
    await nextPlayer()
  }

  const check = async () => {
    const playerData = getCurrentPlayerData()
    if (!playerData || !game) return

    const updatedPlayers = game.players.map((player) =>
      player.playerId === currentPlayer._id 
        ? { ...player, hasActed: true }
        : player
    )

    await fetch("/api/games", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gameId: game._id,
        gameData: { players: updatedPlayers }
      }),
    })

    await nextPlayer()
  }

  const raise = async () => {
    const playerData = getCurrentPlayerData()
    if (!playerData || !game) return

    const maxBet = Math.max(...game.players.map((p) => p.currentBet))
    const raiseAmount = Math.min(betAmount, playerData.chips)
    const totalBet = maxBet + raiseAmount
    const actualBet = Math.min(totalBet - playerData.currentBet, playerData.chips)

    const updatedPlayers = game.players.map((player) => {
      if (player.playerId === currentPlayer._id) {
          return {
          ...player,
          currentBet: player.currentBet + actualBet,
          chips: player.chips - actualBet,
          allIn: player.chips - actualBet === 0,
            hasActed: true,
          }
        }
      return { ...player, hasActed: false } // Reset other players' acted status
    })

    await fetch("/api/games", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gameId: game._id,
        gameData: { players: updatedPlayers }
      }),
    })

    await updateGameState({ pot: game.gameState.pot + actualBet })
    await nextPlayer()
  }

  const botFold = async (botPlayer: Player) => {
    if (!game) return

    const updatedPlayers = game.players.map((player) =>
      player.playerId === botPlayer.playerId 
        ? { ...player, folded: true, hasActed: true }
        : player
    )

    await fetch("/api/games", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gameId: game._id,
        gameData: { players: updatedPlayers }
      }),
    })

    // Bot might send a chat message
    if (Math.random() < 0.15) { // 15% chance
      const foldMessages = [
        "I fold, too risky!",
        "Not feeling this hand",
        "Folding to save my chips",
        "Better luck next hand",
        "This hand isn't for me",
        "Too rich for my blood",
        "I'm out",
        "Fold"
      ]
      
      await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameId: game._id,
          playerId: botPlayer.playerId,
          username: botPlayer.username,
          message: foldMessages[Math.floor(Math.random() * foldMessages.length)]
        }),
      })
    }

    // Check if only one player remains after bot fold
    const activePlayers = updatedPlayers.filter((p) => !p.folded && !p.allIn)
    if (activePlayers.length <= 1) {
      await determineWinner()
      return
    }

    await nextPlayer()
  }

  const botCall = async (botPlayer: Player) => {
    if (!game) return

    const maxBet = Math.max(...game.players.map((p) => p.currentBet))
    const callAmount = Math.min(maxBet - botPlayer.currentBet, botPlayer.chips)

    const updatedPlayers = game.players.map((player) =>
      player.playerId === botPlayer.playerId
        ? {
            ...player,
            currentBet: player.currentBet + callAmount,
            chips: player.chips - callAmount,
            allIn: player.chips - callAmount === 0,
                hasActed: true,
              }
        : player
    )

    await fetch("/api/games", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gameId: game._id,
        gameData: { players: updatedPlayers }
      }),
    })

    await updateGameState({ pot: game.gameState.pot + callAmount })

    // Bot might send a chat message
    if (Math.random() < 0.2) { // 20% chance
      let callMessages = [
        "I'll call that!",
        "Let's see the next card",
        "Calling to stay in",
        "Good enough to call",
        "I'm in!",
        "Count me in",
        "I like those odds",
        "Can't fold this hand",
        "Playing this one",
        "Worth a call"
      ]
      
      // Special messages for small blind defense
      if (botPlayer.isSmallBlind && game.players.filter(p => !p.folded && !p.allIn).length === 2) {
        callMessages = [
          "Defending my small blind",
          "I'm already invested",
          "Getting good odds here",
          "Can't fold for half a bet",
          "Small blind defense",
          "Let's play heads up",
          "Worth defending",
          "I'm in from the small blind"
        ]
      }
      
      await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameId: game._id,
          playerId: botPlayer.playerId,
          username: botPlayer.username,
          message: callMessages[Math.floor(Math.random() * callMessages.length)]
        }),
      })
    }

    await nextPlayer()
  }

  const botCheck = async (botPlayer: Player) => {
    if (!game) return

    const updatedPlayers = game.players.map((player) =>
      player.playerId === botPlayer.playerId 
        ? { ...player, hasActed: true }
        : player
    )

    await fetch("/api/games", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gameId: game._id,
        gameData: { players: updatedPlayers }
      }),
    })

    await nextPlayer()
  }

  const botRaise = async (botPlayer: Player) => {
    if (!game) return

    const maxBet = Math.max(...game.players.map((p) => p.currentBet))
    const callAmount = maxBet - botPlayer.currentBet
    const minRaise = Math.max(game.settings.bigBlind, callAmount)
    
    // Much more aggressive raise sizing
    let raiseMultiplier
    if (Math.random() < 0.4) {
      raiseMultiplier = 2 + Math.random() * 2 // 40% chance: 2x-4x raise (standard)
    } else if (Math.random() < 0.3) {
      raiseMultiplier = 0.5 + Math.random() * 1 // 30% chance: 0.5x-1.5x raise (small)
    } else {
      raiseMultiplier = 4 + Math.random() * 3 // 30% chance: 4x-7x raise (aggressive!)
    }
    
    const potSizedRaise = Math.min(game.gameState.pot * 0.8, botPlayer.chips - callAmount) // Up to 80% pot
    const raiseAmount = Math.min(minRaise * raiseMultiplier, potSizedRaise)
    const totalBet = callAmount + Math.max(raiseAmount, minRaise) // Ensure minimum raise
    const actualBet = Math.min(totalBet, botPlayer.chips)

    const updatedPlayers = game.players.map((player) => {
      if (player.playerId === botPlayer.playerId) {
        return {
          ...player,
          currentBet: player.currentBet + actualBet,
          chips: player.chips - actualBet,
          allIn: player.chips - actualBet === 0,
          hasActed: true,
        }
      }
      return { ...player, hasActed: false } // Reset other players' acted status
    })

    await fetch("/api/games", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gameId: game._id,
        gameData: { players: updatedPlayers }
      }),
    })

    await updateGameState({ pot: game.gameState.pot + actualBet })

    // Bot might send a chat message
    if (Math.random() < 0.3) { // 30% chance - more chat for aggressive bots
      const raiseMessages = [
        "I'm raising the stakes!",
        "Let's make this interesting",
        "Time to up the ante",
        "I like my hand",
        "Raising!",
        "Going big!",
        "Pot odds look good",
        "Feeling aggressive today",
        "Let's build this pot",
        "I'm in to win!",
        "Time to apply pressure",
        "Let's see who's serious",
        "Building the pot!",
        "No backing down",
        "Gotta bet to win",
        "Playing to win big",
        "This hand has potential",
        "All gas, no brakes!"
      ]
      
      await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameId: game._id,
          playerId: botPlayer.playerId,
          username: botPlayer.username,
          message: raiseMessages[Math.floor(Math.random() * raiseMessages.length)]
        }),
      })
    }

    await nextPlayer()
  }

  const nextPlayer = async () => {
    if (!game) return

    // Get sorted players by seat number for proper rotation
    const sortedPlayers = [...game.players].sort((a, b) => a.seatNumber - b.seatNumber)
    const currentPlayerIndex = sortedPlayers.findIndex((_, i) => i === game.gameState.currentPlayer)
    
    let nextIndex = (currentPlayerIndex + 1) % sortedPlayers.length
    
    // Skip folded or all-in players
    while (sortedPlayers[nextIndex].folded || sortedPlayers[nextIndex].allIn) {
      nextIndex = (nextIndex + 1) % sortedPlayers.length
    }

    // Check if only one player remains (everyone else folded)
    const activePlayers = game.players.filter((p) => !p.folded && !p.allIn)
    
    if (activePlayers.length <= 1) {
      // Hand is over - award pot to remaining player
      await determineWinner()
      return
    }

    // Check if betting round is complete
    const maxBet = Math.max(...game.players.map((p) => p.currentBet))
    const allActed = activePlayers.every((p) => p.hasActed && p.currentBet === maxBet)
    
    // Check if we're going back to a player who already acted and matched the current max bet
    // BUT: In preflop, big blind always gets option to act even if they posted the blind
    const nextPlayerData = sortedPlayers[nextIndex]
    const isReturnToActedPlayer = nextPlayerData.hasActed && 
                                  nextPlayerData.currentBet === maxBet &&
                                  !(game.gameState.gamePhase === "preflop" && nextPlayerData.isBigBlind)

    if (allActed || isReturnToActedPlayer) {
      await nextPhase()
    } else {
      await updateGameState({ currentPlayer: nextIndex })
    }
  }

  const nextPhase = async () => {
    if (!game) return

    // Reset player actions for next phase
    const resetPlayers = game.players.map((p) => ({ ...p, hasActed: false, currentBet: 0 }))

    let newCommunityCards = [...game.gameState.communityCards]
    let newDeck = [...game.gameState.deck]
    let newPhase = game.gameState.gamePhase

    if (game.gameState.gamePhase === "preflop") {
      // Deal flop
      newCommunityCards = newDeck.slice(1, 4) // Skip burn card
      newDeck = newDeck.slice(4)
      newPhase = "flop"
    } else if (game.gameState.gamePhase === "flop") {
      // Deal turn
      newCommunityCards = [...newCommunityCards, newDeck[1]] // Skip burn card
      newDeck = newDeck.slice(2)
      newPhase = "turn"
    } else if (game.gameState.gamePhase === "turn") {
      // Deal river
      newCommunityCards = [...newCommunityCards, newDeck[1]] // Skip burn card
      newDeck = newDeck.slice(2)
      newPhase = "river"
    } else if (game.gameState.gamePhase === "river") {
      newPhase = "showdown"
      await determineWinner()
      return
    }

    // Set current player to first active player after dealer in seat order
    const sortedPlayers = [...game.players].sort((a, b) => a.seatNumber - b.seatNumber)
    let firstActiveIndex = 0
    while (sortedPlayers[firstActiveIndex].folded || sortedPlayers[firstActiveIndex].allIn) {
      firstActiveIndex = (firstActiveIndex + 1) % sortedPlayers.length
    }

    await fetch("/api/games", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gameId: game._id,
        gameData: { players: resetPlayers }
      }),
    })

    await updateGameState({
      communityCards: newCommunityCards,
      deck: newDeck,
      gamePhase: newPhase as "preflop" | "flop" | "turn" | "river" | "showdown",
      currentPlayer: firstActiveIndex
    })
  }

  const determineWinner = async () => {
    if (!game) return

    const activePlayers = game.players.filter((p) => !p.folded)
    if (activePlayers.length === 1) {
      setWinner(activePlayers[0].username)
      // Award pot to winner
      const updatedPlayers = game.players.map((p) =>
        p.playerId === activePlayers[0].playerId 
          ? { ...p, chips: p.chips + game.gameState.pot }
          : p
      )

      await fetch("/api/games", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameId: game._id,
          gameData: { players: updatedPlayers }
        }),
      })
    } else {
      // Evaluate hands
      const playerHands = activePlayers.map((player) => ({
        player,
        hand: evaluateHand([...player.cards, ...game.gameState.communityCards]),
      }))

      playerHands.sort((a, b) => compareHands(b.hand, a.hand))
      const winner = playerHands[0]

      setWinner(winner.player.username)
      
      const updatedPlayers = game.players.map((p) =>
        p.playerId === winner.player.playerId 
          ? { ...p, chips: p.chips + game.gameState.pot }
          : p
      )

      await fetch("/api/games", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameId: game._id,
          gameData: { players: updatedPlayers }
        }),
      })
    }

    await updateGameState({ pot: 0, gamePhase: "showdown" })
  }

  const handleSeatChange = async (newSeatNumber: number) => {
    if (!game) return

    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "changeSeat",
          gameId: game._id,
          playerId: currentPlayer._id,
          newSeatNumber: newSeatNumber
        }),
      })

      if (response.ok) {
        fetchGame()
      } else {
        const data = await response.json()
        setError(data.error || "Failed to change seat")
      }
    } catch (error) {
      setError("Network error occurred")
    }
  }

  const pauseGame = async () => {
    if (!game || game.createdBy !== currentPlayer._id) return

    try {
      const response = await fetch("/api/games", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameId: game._id,
          gameData: { 
            status: game.status === 'paused' ? 'active' : 'paused'
          }
        }),
      })

      if (response.ok) {
        fetchGame()
      } else {
        const data = await response.json()
        setError(data.error || "Failed to pause/resume game")
      }
    } catch (error) {
      setError("Network error occurred")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-green-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading game...</div>
      </div>
    )
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-green-900 flex items-center justify-center">
        <div className="text-white text-xl">{error || "Game not found"}</div>
      </div>
    )
  }

  const currentPlayerData = getCurrentPlayerData()
  const maxBet = Math.max(...game.players.map((p) => p.currentBet))
  const canCall = currentPlayerData && currentPlayerData.currentBet < maxBet
  const canCheck = currentPlayerData && currentPlayerData.currentBet === maxBet
  const canRaise = currentPlayerData && currentPlayerData.chips > 0
  const isCurrentPlayerTurn = game.players[game.gameState.currentPlayer]?.playerId === currentPlayer._id
  const isGameCreator = game.createdBy === currentPlayer._id

  return (
    <div className="min-h-screen bg-green-900 p-2 sm:p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2 sm:gap-0">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={onBackToDashboard} size="sm" className="flex-shrink-0">
          <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Button>
          
          {isGameCreator && game.status !== 'waiting' && (
            <>
              <Button 
                variant="outline" 
                onClick={pauseGame}
                size="sm"
                className={`${game.status === 'paused' ? 'bg-yellow-600 text-white' : ''} flex-shrink-0`}
              >
                {game.status === 'paused' ? (
                  <>
                    <Play className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Resume</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Pause</span>
                  </>
                )}
        </Button>
              
              <div className="flex-shrink-0">
                <InvitePlayersModal
                  gameId={game._id}
                  currentPlayers={game.players}
                  maxPlayers={game.settings.maxPlayers}
                  onInviteSent={fetchGame}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-white text-sm sm:text-base w-full sm:w-auto">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <Users className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="truncate">{game.gameName.length > 15 ? game.gameName.substring(0, 15) + '...' : game.gameName}</span>
            {game.status === 'paused' && (
              <Badge variant="secondary" className="bg-yellow-600 text-xs">PAUSED</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <DollarSign className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">
              Blinds: ${game.settings.smallBlind}/${game.settings.bigBlind}
            </span>
            <span className="sm:hidden">
              ${game.settings.smallBlind}/${game.settings.bigBlind}
            </span>
          </div>
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="capitalize">{game.gameState.gamePhase}</span>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="max-w-6xl mx-auto px-2 sm:px-4">
        {game.status === 'waiting' ? (
          <div className="text-center">
            <div className="text-white mb-4">
              <h2 className="text-2xl font-bold mb-2">Waiting for players...</h2>
              <p>{game.players.length}/{game.settings.maxPlayers} players joined</p>
            </div>
            {isGameCreator && (
            <Button onClick={startNewHand} size="lg">
                Start Game
            </Button>
            )}
          </div>
        ) : (
          <>
            {/* Poker Table with Oval Layout */}
            <div className="mb-4 sm:mb-8">
              <PokerTableLayout
                players={game.players}
                currentPlayer={currentPlayer}
                gamePhase={game.gameState.gamePhase}
                communityCards={game.gameState.communityCards}
                pot={game.gameState.pot}
                maxPlayers={game.settings.maxPlayers}
                gameStatus={game.status}
                isGameCreator={isGameCreator}
                currentPlayerTurn={game.gameState.currentPlayer}
                onSeatSelect={handleSeatChange}
                canChangeSeat={game.status === 'waiting' || game.status === 'paused'}
              />
            </div>

            {/* Game Controls */}
            {game.status === 'paused' ? (
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-4">Game Paused</h2>
                <p className="text-white">Waiting for the game creator to resume...</p>
              </div>
            ) : game.gameState.gamePhase === "showdown" ? (
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-4">Winner: {winner}</h2>
                {isGameCreator && (
                <Button onClick={startNewHand} size="lg">
                  Deal Next Hand
                </Button>
                )}
              </div>
            ) : !hasCardsBeenDealt ? (
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-4">Ready to Start</h2>
                <p className="text-white mb-4">Game is ready. Deal the first hand to begin!</p>
                {isGameCreator && (
                  <Button onClick={startNewHand} size="lg">
                    Deal Cards
                  </Button>
                )}
              </div>
            ) : (
              isCurrentPlayerTurn && currentPlayerData && currentPlayerData.cards && currentPlayerData.cards.length > 0 && 
              game.players.filter(p => !p.folded && !p.allIn).length > 1 && (
              <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4 items-center px-4 sm:px-0">
                <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
                  <Button onClick={fold} variant="destructive" size="lg" className="flex-1 sm:flex-none min-h-12">
                    Fold
                  </Button>

                  {canCheck && (
                    <Button onClick={check} variant="secondary" size="lg" className="flex-1 sm:flex-none min-h-12">
                      Check
                    </Button>
                  )}

                  {canCall && (
                    <Button onClick={call} size="lg" className="flex-1 sm:flex-none min-h-12">
                      Call ${maxBet - currentPlayerData.currentBet}
                    </Button>
                  )}
                </div>

                {canRaise && (
                  <div className="flex gap-2 items-center w-full sm:w-auto">
                    <Input
                      type="number"
                      value={betAmount}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBetAmount(Number.parseInt(e.target.value) || 0)}
                      className="w-20 sm:w-24 min-h-12"
                        min={game.settings.bigBlind}
                      max={currentPlayerData.chips}
                    />
                    <Button onClick={raise} size="lg" className="flex-1 sm:flex-none min-h-12">Raise</Button>
                  </div>
                )}
              </div>
              )
            )}

            {/* Mobile Your Hand - In flow after game controls */}
            <div className="block sm:hidden">
              {currentPlayerData && currentPlayerData.cards && currentPlayerData.cards.length > 0 && (
                <CurrentPlayerCards
                  cards={currentPlayerData.cards}
                  playerName={currentPlayerData.username}
                  chips={currentPlayerData.chips}
                />
              )}
            </div>

            {/* Mobile Chat - Always visible below your hand */}
            <div className="block sm:hidden mt-6">
              <GameChat
                gameId={game._id}
                currentPlayer={currentPlayer}
              />
            </div>

            {/* Show waiting message for non-creators when cards haven't been dealt */}
            {!hasCardsBeenDealt && !isGameCreator && game.status === 'active' && (
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-4">Waiting for Cards</h2>
                <p className="text-white">The game creator will deal cards to start the hand.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Desktop Chat - Floating widget */}
      <div className="hidden sm:block">
        <GameChat gameId={game._id} currentPlayer={currentPlayer} />
      </div>

      {/* Desktop Current Player's Cards - Floating modal */}
      <div className="hidden sm:block">
        {currentPlayerData && currentPlayerData.cards && currentPlayerData.cards.length > 0 && (
          <CurrentPlayerCards
            cards={currentPlayerData.cards}
            playerName={currentPlayerData.username}
            chips={currentPlayerData.chips}
          />
        )}
      </div>
    </div>
  )
}
