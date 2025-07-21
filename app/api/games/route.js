import {
  getGames,
  getActiveGames,
  getGameById,
  getGamesByPlayerId,
  createGame,
  updateGame,
  addPlayerToGame,
  removePlayerFromGame,
  updateGameState,
  addHandToHistory,
  deleteGame
} from "@/lib/mongo/gamesCRUD"
import { getPlayerByUsername } from "@/lib/mongo/playersCRUD"
import { NextResponse } from "next/server"

// Handle GET requests
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const gameId = searchParams.get("gameId")
    const playerId = searchParams.get("playerId")
    const activeOnly = searchParams.get("activeOnly")

    if (gameId) {
      // Fetch a specific game by ID
      const game = await getGameById(gameId)
      if (!game) {
        return NextResponse.json({ error: "Game not found" }, { status: 404 })
      }
      return NextResponse.json(game)
    } else if (playerId) {
      // Fetch games for a specific player
      const games = await getGamesByPlayerId(playerId)
      return NextResponse.json(games)
    } else if (activeOnly === "true") {
      // Fetch only active games
      const games = await getActiveGames()
      return NextResponse.json(games)
    } else {
      // Fetch all games
      const games = await getGames()
      return NextResponse.json(games)
    }
  } catch (error) {
    console.error("Error in GET /api/games:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Handle POST requests
export async function POST(request) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case "createGame":
        const { createdBy, creatorUsername, gameName, invitedPlayers, numBots, settings } = body
        if (!createdBy || !gameName) {
          return NextResponse.json({ error: "createdBy and gameName are required" }, { status: 400 })
        }

        const gameData = {
          createdBy,
          creatorUsername,
          gameName,
          invitedPlayers: invitedPlayers || [],
          numBots: numBots || 0,
          settings
        }

        const newGame = await createGame(gameData)
        return NextResponse.json({ 
          success: true, 
          message: "Game created successfully",
          gameId: newGame.insertedId
        })

      case "joinGame":
        const { gameId, playerId, username, seatNumber } = body
        if (!gameId || !playerId || !username) {
          return NextResponse.json({ error: "gameId, playerId, and username are required" }, { status: 400 })
        }

        const playerData = { playerId, username, seatNumber }
        const joinResult = await addPlayerToGame(gameId, playerData)
        return NextResponse.json({ success: true, data: joinResult })

      case "leaveGame":
        const { gameId: leaveGameId, playerId: leavePlayerId } = body
        if (!leaveGameId || !leavePlayerId) {
          return NextResponse.json({ error: "gameId and playerId are required" }, { status: 400 })
        }

        const leaveResult = await removePlayerFromGame(leaveGameId, leavePlayerId)
        return NextResponse.json({ success: true, data: leaveResult })

      case "updateGameState":
        const { gameId: updateGameId, gameState } = body
        if (!updateGameId || !gameState) {
          return NextResponse.json({ error: "gameId and gameState are required" }, { status: 400 })
        }

        const updateResult = await updateGameState(updateGameId, gameState)
        return NextResponse.json({ success: true, data: updateResult })

      case "addHandHistory":
        const { gameId: historyGameId, handData } = body
        if (!historyGameId || !handData) {
          return NextResponse.json({ error: "gameId and handData are required" }, { status: 400 })
        }

        const historyResult = await addHandToHistory(historyGameId, handData)
        return NextResponse.json({ success: true, data: historyResult })

      case "startGame":
        const { gameId: startGameId } = body
        if (!startGameId) {
          return NextResponse.json({ error: "gameId is required" }, { status: 400 })
        }

        const startResult = await updateGame(startGameId, { status: 'active' })
        return NextResponse.json({ success: true, data: startResult })

      case "endGame":
        const { gameId: endGameId, finalResults } = body
        if (!endGameId) {
          return NextResponse.json({ error: "gameId is required" }, { status: 400 })
        }

        const endResult = await updateGame(endGameId, { 
          status: 'completed',
          finalResults: finalResults || {},
          completedAt: new Date()
        })
        return NextResponse.json({ success: true, data: endResult })

      case "invitePlayer":
        const { gameId: inviteGameId, username: inviteUsername } = body
        if (!inviteGameId || !inviteUsername) {
          return NextResponse.json({ error: "gameId and username are required" }, { status: 400 })
        }

        // Check if user exists
        const player = await getPlayerByUsername(inviteUsername)
        if (!player) {
          return NextResponse.json({ error: "Player not found" }, { status: 404 })
        }

        // Check if game exists and has space
        const game = await getGameById(inviteGameId)
        if (!game) {
          return NextResponse.json({ error: "Game not found" }, { status: 404 })
        }

        if (game.players.length >= game.settings.maxPlayers) {
          return NextResponse.json({ error: "Game is full" }, { status: 400 })
        }

        // Check if player is already in game
        if (game.players.some(p => p.playerId === player._id)) {
          return NextResponse.json({ error: "Player is already in this game" }, { status: 400 })
        }

        // Add to invited players list (they can join when they see it)
        const inviteResult = await updateGame(inviteGameId, {
          invitedPlayers: [...(game.invitedPlayers || []), inviteUsername]
        })

        return NextResponse.json({ success: true, message: "Player invited successfully" })

      case "archiveGame":
        const { gameId: archiveGameId } = body
        if (!archiveGameId) {
          return NextResponse.json({ error: "gameId is required" }, { status: 400 })
        }

        const archiveResult = await updateGame(archiveGameId, { 
          status: 'archived',
          archivedAt: new Date()
        })
        return NextResponse.json({ success: true, data: archiveResult })

      case "changeSeat":
        const { gameId: seatGameId, playerId: seatPlayerId, newSeatNumber } = body
        if (!seatGameId || !seatPlayerId || newSeatNumber === undefined) {
          return NextResponse.json({ error: "gameId, playerId, and newSeatNumber are required" }, { status: 400 })
        }

        // Get the game
        const seatGame = await getGameById(seatGameId)
        if (!seatGame) {
          return NextResponse.json({ error: "Game not found" }, { status: 404 })
        }

        // Check if seat is available
        const isSeatTaken = seatGame.players.some(p => p.seatNumber === newSeatNumber)
        if (isSeatTaken) {
          return NextResponse.json({ error: "Seat is already taken" }, { status: 400 })
        }

        // Update player's seat
        const updatedPlayersForSeat = seatGame.players.map(player => 
          player.playerId === seatPlayerId 
            ? { ...player, seatNumber: newSeatNumber }
            : player
        )

        const seatResult = await updateGame(seatGameId, { players: updatedPlayersForSeat })
        return NextResponse.json({ success: true, data: seatResult })

      case "addChipsToPlayer":
        const { gameId: chipGameId, playerId: chipPlayerId, chipAmount } = body
        if (!chipGameId || !chipPlayerId || !chipAmount) {
          return NextResponse.json({ error: "gameId, playerId, and chipAmount are required" }, { status: 400 })
        }

        if (chipAmount <= 0) {
          return NextResponse.json({ error: "Chip amount must be positive" }, { status: 400 })
        }

        // Get the game
        const chipGame = await getGameById(chipGameId)
        if (!chipGame) {
          return NextResponse.json({ error: "Game not found" }, { status: 404 })
        }

        // Find the player and add chips
        const updatedPlayersForChips = chipGame.players.map(player => 
          player.playerId === chipPlayerId 
            ? { ...player, chips: player.chips + chipAmount }
            : player
        )

        // Check if player was found
        const playerFound = chipGame.players.some(p => p.playerId === chipPlayerId)
        if (!playerFound) {
          return NextResponse.json({ error: "Player not found in game" }, { status: 404 })
        }

        const chipResult = await updateGame(chipGameId, { players: updatedPlayersForChips })
        return NextResponse.json({ success: true, data: chipResult })

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error in POST /api/games:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Handle PUT requests for updating game information
export async function PUT(request) {
  try {
    const body = await request.json()
    const { gameId, gameData } = body

    if (!gameId || !gameData) {
      return NextResponse.json({ error: "gameId and gameData are required" }, { status: 400 })
    }

    const result = await updateGame(gameId, gameData)
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error("Error in PUT /api/games:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Handle DELETE requests
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const gameId = searchParams.get("gameId")

    if (!gameId) {
      return NextResponse.json({ error: "gameId is required" }, { status: 400 })
    }

    const result = await deleteGame(gameId)
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error("Error in DELETE /api/games:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
} 