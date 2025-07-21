import {
  getPlayers,
  getPlayerById,
  createPlayer,
  updatePlayer,
  deletePlayer,
  authenticatePlayer,
  updatePlayerStats,
  getPlayerByUsername,
  cleanupOrphanedStats
} from "@/lib/mongo/playersCRUD"
import { NextResponse } from "next/server"

// Handle GET requests
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const playerId = searchParams.get("playerId")
    const username = searchParams.get("username")

    if (playerId) {
      // Fetch a specific player by ID
      const player = await getPlayerById(playerId)
      if (!player) {
        return NextResponse.json({ error: "Player not found" }, { status: 404 })
      }
      return NextResponse.json(player)
    } else if (username) {
      // Fetch a specific player by username
      const player = await getPlayerByUsername(username)
      if (!player) {
        return NextResponse.json({ error: "Player not found" }, { status: 404 })
      }
      return NextResponse.json(player)
    } else {
      // Fetch all players
      const players = await getPlayers()
      return NextResponse.json(players)
    }
  } catch (error) {
    console.error("Error in GET /api/players:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Handle POST requests
export async function POST(request) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case "signup":
        const { username, password } = body
        if (!username || !password) {
          return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
        }

        const newPlayer = await createPlayer({ username, password })
        return NextResponse.json({ 
          success: true, 
          message: "Player created successfully",
          playerId: newPlayer.insertedId
        })

      case "signin":
        const { username: loginUsername, password: loginPassword } = body
        if (!loginUsername || !loginPassword) {
          return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
        }

        try {
          const player = await authenticatePlayer(loginUsername, loginPassword)
          return NextResponse.json({ 
            success: true, 
            message: "Authentication successful",
            player: {
              _id: player._id,
              username: player.username,
              stats: player.stats,
              gameHistory: player.gameHistory
            }
          })
        } catch (authError) {
          return NextResponse.json({ error: "Invalid username or password" }, { status: 401 })
        }

      case "updateStats":
        const { playerId, gameStats } = body
        if (!playerId || !gameStats) {
          return NextResponse.json({ error: "playerId and gameStats are required" }, { status: 400 })
        }

        const result = await updatePlayerStats(playerId, gameStats)
        return NextResponse.json({ success: true, data: result })

      case "cleanupStats":
        const { playerId: cleanupPlayerId } = body
        if (!cleanupPlayerId) {
          return NextResponse.json({ error: "playerId is required" }, { status: 400 })
        }

        const cleanupResult = await cleanupOrphanedStats(cleanupPlayerId)
        return NextResponse.json({ 
          success: true, 
          data: cleanupResult,
          message: `Cleaned up ${cleanupResult.cleanedEntries} orphaned entries, ${cleanupResult.validEntries} entries remain`
        })

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error in POST /api/players:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Handle PUT requests for updating player information
export async function PUT(request) {
  try {
    const body = await request.json()
    const { playerId, playerData } = body

    if (!playerId || !playerData) {
      return NextResponse.json({ error: "playerId and playerData are required" }, { status: 400 })
    }

    const result = await updatePlayer(playerId, playerData)
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error("Error in PUT /api/players:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Handle DELETE requests
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const playerId = searchParams.get("playerId")

    if (!playerId) {
      return NextResponse.json({ error: "playerId is required" }, { status: 400 })
    }

    const result = await deletePlayer(playerId)
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error("Error in DELETE /api/players:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
} 