//lib/mongo/playersCRUD.js
import clientPromise from './mongoConnect.js';
import { ObjectId } from 'mongodb';

// Fetch all players from the Players collection
export async function getPlayers() {
  try {
    const client = await clientPromise;
    const db = client.db('Poker');
    const collection = db.collection('players');
    const players = await collection.find({}).toArray();
    return players;
  } catch (error) {
    console.error('Error fetching players:', error);
    throw new Error('Failed to fetch players');
  }
}

// Fetch a single player by ID
export async function getPlayerById(playerId) {
  try {
    const client = await clientPromise;
    const db = client.db('Poker');
    const collection = db.collection('players');
    
    let objectIdPlayerId;
    try {
      objectIdPlayerId = typeof playerId === 'string' ? new ObjectId(playerId) : playerId;
    } catch (err) {
      console.error('Invalid ObjectId format:', playerId);
      return null;
    }
    
    const player = await collection.findOne({ _id: objectIdPlayerId });
    return player;
  } catch (error) {
    console.error('Error fetching player by ID:', error);
    throw new Error('Failed to fetch player by ID');
  }
}

// Fetch a player by username
export async function getPlayerByUsername(username) {
  try {
    const client = await clientPromise;
    const db = client.db('Poker');
    const collection = db.collection('players');
    const player = await collection.findOne({ username: username });
    return player;
  } catch (error) {
    console.error('Error fetching player by username:', error);
    throw new Error('Failed to fetch player by username');
  }
}

// Create a new player (sign up)
export async function createPlayer(playerData) {
  try {
    const client = await clientPromise;
    const db = client.db('Poker');
    const collection = db.collection('players');
    
    // Check if username already exists
    const existingPlayer = await collection.findOne({ username: playerData.username });
    if (existingPlayer) {
      throw new Error('Username already exists');
    }
    
    // Add default stats and timestamps
    const newPlayer = {
      ...playerData,
      createdAt: new Date(),
      stats: {
        gamesPlayed: 0,
        handsDealt: 0,
        handsPlayed: 0,
        handsWon: 0,
        totalWinnings: 0,
        totalLosses: 0,
        netEarnings: 0,
        winPercentage: 0
      },
      gameHistory: []
    };
    
    const result = await collection.insertOne(newPlayer);
    return result;
  } catch (error) {
    console.error('Error creating player:', error);
    throw new Error('Failed to create player: ' + error.message);
  }
}

// Update a player's details by ID
export async function updatePlayer(playerId, updateData) {
  try {
    const client = await clientPromise;
    const db = client.db('Poker');
    const collection = db.collection('players');
    
    let objectIdPlayerId;
    try {
      objectIdPlayerId = typeof playerId === 'string' ? new ObjectId(playerId) : playerId;
    } catch (err) {
      console.error('Invalid ObjectId format:', playerId);
      return { modifiedCount: 0 };
    }
    
    const result = await collection.updateOne(
      { _id: objectIdPlayerId },
      { $set: { ...updateData, updatedAt: new Date() } }
    );
    return result;
  } catch (error) {
    console.error('Error updating player:', error);
    throw new Error('Failed to update player');
  }
}

// Update player stats after a game
export async function updatePlayerStats(playerId, gameStats) {
  try {
    const client = await clientPromise;
    const db = client.db('Poker');
    const collection = db.collection('players');
    
    let objectIdPlayerId;
    try {
      objectIdPlayerId = typeof playerId === 'string' ? new ObjectId(playerId) : playerId;
    } catch (err) {
      console.error('Invalid ObjectId format:', playerId);
      return { modifiedCount: 0 };
    }
    
    const player = await collection.findOne({ _id: objectIdPlayerId });
    if (!player) {
      throw new Error('Player not found');
    }
    
    // Calculate new stats
    const newStats = {
      gamesPlayed: player.stats.gamesPlayed + 1,
      handsDealt: player.stats.handsDealt + gameStats.handsDealt,
      handsPlayed: player.stats.handsPlayed + gameStats.handsPlayed,
      handsWon: player.stats.handsWon + gameStats.handsWon,
      totalWinnings: player.stats.totalWinnings + (gameStats.netEarnings > 0 ? gameStats.netEarnings : 0),
      totalLosses: player.stats.totalLosses + (gameStats.netEarnings < 0 ? Math.abs(gameStats.netEarnings) : 0),
      netEarnings: player.stats.netEarnings + gameStats.netEarnings
    };
    
    // Calculate win percentage
    newStats.winPercentage = newStats.handsPlayed > 0 ? (newStats.handsWon / newStats.handsPlayed) * 100 : 0;
    
    const result = await collection.updateOne(
      { _id: objectIdPlayerId },
      { 
        $set: { 
          stats: newStats,
          updatedAt: new Date()
        },
        $push: {
          gameHistory: {
            gameId: gameStats.gameId,
            date: new Date(),
            handsPlayed: gameStats.handsPlayed,
            handsWon: gameStats.handsWon,
            netEarnings: gameStats.netEarnings
          }
        }
      }
    );
    
    return result;
  } catch (error) {
    console.error('Error updating player stats:', error);
    throw new Error('Failed to update player stats');
  }
}

// Delete a player by ID
export async function deletePlayer(playerId) {
  try {
    const client = await clientPromise;
    const db = client.db('Poker');
    const collection = db.collection('players');
    
    let objectIdPlayerId;
    try {
      objectIdPlayerId = typeof playerId === 'string' ? new ObjectId(playerId) : playerId;
    } catch (err) {
      console.error('Invalid ObjectId format:', playerId);
      return { deletedCount: 0 };
    }
    
    const result = await collection.deleteOne({ _id: objectIdPlayerId });
    return result;
  } catch (error) {
    console.error('Error deleting player:', error);
    throw new Error('Failed to delete player');
  }
}

// Authenticate player (sign in)
export async function authenticatePlayer(username, password) {
  try {
    const client = await clientPromise;
    const db = client.db('Poker');
    const collection = db.collection('players');
    
    const player = await collection.findOne({ username: username, password: password });
    if (!player) {
      throw new Error('Invalid username or password');
    }
    
    return player;
  } catch (error) {
    console.error('Error authenticating player:', error);
    throw new Error('Authentication failed');
  }
} 

// Clean up orphaned game stats for a player (games that no longer exist)
export async function cleanupOrphanedStats(playerId) {
  try {
    const client = await clientPromise;
    const db = client.db('Poker');
    const playersCollection = db.collection('players');
    const gamesCollection = db.collection('games');
    
    let objectIdPlayerId;
    try {
      objectIdPlayerId = typeof playerId === 'string' ? new ObjectId(playerId) : playerId;
    } catch (err) {
      console.error('Invalid ObjectId format:', playerId);
      return { modifiedCount: 0 };
    }

    const player = await playersCollection.findOne({ _id: objectIdPlayerId });
    if (!player) {
      throw new Error('Player not found');
    }

    // Get list of all existing game IDs
    const existingGames = await gamesCollection.find({}, { projection: { _id: 1 } }).toArray();
    const existingGameIds = new Set(existingGames.map(g => g._id.toString()));

    // Filter out gameHistory entries for games that no longer exist
    const validGameHistory = player.gameHistory.filter(gameEntry => {
      const gameIdStr = typeof gameEntry.gameId === 'string' ? gameEntry.gameId : gameEntry.gameId.toString();
      return existingGameIds.has(gameIdStr);
    });

    // Recalculate stats from valid games only
    const uniqueGameIds = new Set(validGameHistory.map(g => 
      typeof g.gameId === 'string' ? g.gameId : g.gameId.toString()
    ));
    
    const newStats = {
      gamesPlayed: uniqueGameIds.size,
      handsDealt: validGameHistory.reduce((sum, g) => sum + (g.handsDealt || 0), 0),
      handsPlayed: validGameHistory.reduce((sum, g) => sum + g.handsPlayed, 0),
      handsWon: validGameHistory.reduce((sum, g) => sum + g.handsWon, 0),
      totalWinnings: validGameHistory.reduce((sum, g) => sum + (g.netEarnings > 0 ? g.netEarnings : 0), 0),
      totalLosses: validGameHistory.reduce((sum, g) => sum + (g.netEarnings < 0 ? Math.abs(g.netEarnings) : 0), 0),
      netEarnings: validGameHistory.reduce((sum, g) => sum + g.netEarnings, 0)
    };

    // Calculate win percentage
    newStats.winPercentage = newStats.handsPlayed > 0 ? (newStats.handsWon / newStats.handsPlayed) * 100 : 0;

    // Update player with cleaned stats and gameHistory
    const result = await playersCollection.updateOne(
      { _id: objectIdPlayerId },
      { 
        $set: { 
          stats: newStats,
          gameHistory: validGameHistory,
          updatedAt: new Date()
        }
      }
    );

    return {
      ...result,
      cleanedEntries: player.gameHistory.length - validGameHistory.length,
      validEntries: validGameHistory.length
    };
  } catch (error) {
    console.error('Error cleaning up orphaned stats:', error);
    throw new Error('Failed to cleanup orphaned stats');
  }
} 