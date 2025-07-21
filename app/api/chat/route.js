import clientPromise from "@/lib/mongo/mongoConnect.js"
import { NextResponse } from "next/server"
import { ObjectId } from 'mongodb'

// Handle GET requests - fetch chat messages for a game
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const gameId = searchParams.get("gameId")

    if (!gameId) {
      return NextResponse.json({ error: "gameId is required" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db('Poker')
    const collection = db.collection('chat')

    // Fetch messages for the game, sorted by timestamp
    const messages = await collection
      .find({ gameId: gameId })
      .sort({ timestamp: 1 })
      .limit(100) // Limit to last 100 messages
      .toArray()

    return NextResponse.json(messages)
  } catch (error) {
    console.error("Error fetching chat messages:", error)
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
  }
}

// Handle POST requests - send a new chat message
export async function POST(request) {
  try {
    const body = await request.json()
    const { gameId, playerId, username, message } = body

    if (!gameId || !playerId || !username || !message) {
      return NextResponse.json({ 
        error: "gameId, playerId, username, and message are required" 
      }, { status: 400 })
    }

    // Validate message length
    if (message.length > 200) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db('Poker')
    const collection = db.collection('chat')

    const chatMessage = {
      gameId: gameId,
      playerId: playerId,
      username: username,
      message: message.trim(),
      timestamp: new Date(),
      isBot: username.startsWith('Bot ')
    }

    const result = await collection.insertOne(chatMessage)

    return NextResponse.json({ 
      success: true, 
      messageId: result.insertedId 
    })
  } catch (error) {
    console.error("Error sending chat message:", error)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}

// Handle DELETE requests - clear chat for a game (admin only)
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const gameId = searchParams.get("gameId")

    if (!gameId) {
      return NextResponse.json({ error: "gameId is required" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db('Poker')
    const collection = db.collection('chat')

    const result = await collection.deleteMany({ gameId: gameId })

    return NextResponse.json({ 
      success: true, 
      deletedCount: result.deletedCount 
    })
  } catch (error) {
    console.error("Error clearing chat messages:", error)
    return NextResponse.json({ error: "Failed to clear messages" }, { status: 500 })
  }
} 