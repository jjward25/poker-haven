//lib/mongo/gamesCRUD.js
import clientPromise from './mongoConnect.js';
import { ObjectId } from 'mongodb';

// Fetch all games
export async function getGames() {
  try {
    const client = await clientPromise;
    const db = client.db('Poker');
    const collection = db.collection('games');
    const games = await collection.find({}).toArray();
    return games;
  } catch (error) {
    console.error('Error fetching games:', error);
    throw new Error('Failed to fetch games');
  }
}

// Fetch active games (not completed)
export async function getActiveGames() {
  try {
    const client = await clientPromise;
    const db = client.db('Poker');
    const collection = db.collection('games');
    const games = await collection.find({ status: { $ne: 'completed' } }).toArray();
    return games;
  } catch (error) {
    console.error('Error fetching active games:', error);
    throw new Error('Failed to fetch active games');
  }
}

// Fetch a single game by ID
export async function getGameById(gameId) {
  try {
    const client = await clientPromise;
    const db = client.db('Poker');
    const collection = db.collection('games');
    
    let objectIdGameId;
    try {
      objectIdGameId = typeof gameId === 'string' ? new ObjectId(gameId) : gameId;
    } catch (err) {
      console.error('Invalid ObjectId format:', gameId);
      return null;
    }
    
    const game = await collection.findOne({ _id: objectIdGameId });
    return game;
  } catch (error) {
    console.error('Error fetching game by ID:', error);
    throw new Error('Failed to fetch game by ID');
  }
}

// Fetch games by player ID
export async function getGamesByPlayerId(playerId) {
  try {
    const client = await clientPromise;
    const db = client.db('Poker');
    const collection = db.collection('games');
    
    const games = await collection.find({ 
      $or: [
        { createdBy: playerId },
        { 'players.playerId': playerId },
        { 'invitedPlayers': playerId }
      ]
    }).toArray();
    
    return games;
  } catch (error) {
    console.error('Error fetching games by player ID:', error);
    throw new Error('Failed to fetch games by player ID');
  }
}

// Create a new game
export async function createGame(gameData) {
  try {
    const client = await clientPromise;
    const db = client.db('Poker');
    const collection = db.collection('games');
    
    // Always add the game creator as the first player
    const players = [{
      playerId: gameData.createdBy,
      username: gameData.creatorUsername || 'Game Creator',
      chips: gameData.settings?.startingChips || 10000,
      seatNumber: 0,
      isReady: true,
      cards: [],
      currentBet: 0,
      folded: false,
      allIn: false,
      isDealer: false,
      isSmallBlind: false,
      isBigBlind: false,
      hasActed: false,
      isBot: false,
      joinedAt: new Date()
    }];
    
    // Create bot players if specified (but leave room for the creator)
    const numBots = gameData.numBots || 0;
    const maxPlayers = gameData.settings?.maxPlayers || 10;
    const actualNumBots = Math.min(numBots, maxPlayers - 1); // Leave one spot for creator
    
    for (let i = 0; i < actualNumBots; i++) {
      players.push({
        playerId: `bot_${Date.now()}_${i}`,
        username: `Bot ${i + 1}`,
        chips: gameData.settings?.startingChips || 10000,
        seatNumber: i + 1,
        isReady: true,
        cards: [],
        currentBet: 0,
        folded: false,
        allIn: false,
        isDealer: false,
        isSmallBlind: false,
        isBigBlind: false,
        hasActed: false,
        isBot: true,
        joinedAt: new Date()
      });
    }
    
    const newGame = {
      ...gameData,
      createdAt: new Date(),
      status: 'waiting', // waiting, active, completed
      currentHand: 0,
      players: players, // Start with creator + bot players
      gameState: {
        deck: [],
        communityCards: [],
        pot: 0,
        currentPlayer: 0,
        gamePhase: 'preflop', // preflop, flop, turn, river, showdown
        dealerPosition: 0,
        smallBlindPosition: 1,
        bigBlindPosition: 2
      },
      handHistory: [],
      settings: {
        startingChips: gameData.settings?.startingChips || 10000,
        chipBreakdown: gameData.settings?.chipBreakdown || null,
        smallBlind: gameData.settings?.smallBlind || 50,
        bigBlind: gameData.settings?.bigBlind || 100,
        blindIncreaseAmount: gameData.settings?.blindIncreaseAmount || 2,
        blindIncreaseFrequency: gameData.settings?.blindIncreaseFrequency || 20,
        straddlingAllowed: gameData.settings?.straddlingAllowed || false,
        maxPlayers: gameData.settings?.maxPlayers || 10
      }
    };
    
    const result = await collection.insertOne(newGame);
    return result;
  } catch (error) {
    console.error('Error creating game:', error);
    throw new Error('Failed to create game');
  }
}

// Update game state
export async function updateGame(gameId, updateData) {
  try {
    const client = await clientPromise;
    const db = client.db('Poker');
    const collection = db.collection('games');
    
    let objectIdGameId;
    try {
      objectIdGameId = typeof gameId === 'string' ? new ObjectId(gameId) : gameId;
    } catch (err) {
      console.error('Invalid ObjectId format:', gameId);
      return { modifiedCount: 0 };
    }
    
    const result = await collection.updateOne(
      { _id: objectIdGameId },
      { $set: { ...updateData, updatedAt: new Date() } }
    );
    return result;
  } catch (error) {
    console.error('Error updating game:', error);
    throw new Error('Failed to update game');
  }
}

// Add player to game
export async function addPlayerToGame(gameId, playerData) {
  try {
    const client = await clientPromise;
    const db = client.db('Poker');
    const collection = db.collection('games');
    
    let objectIdGameId;
    try {
      objectIdGameId = typeof gameId === 'string' ? new ObjectId(gameId) : gameId;
    } catch (err) {
      console.error('Invalid ObjectId format:', gameId);
      return { modifiedCount: 0 };
    }
    
    const game = await collection.findOne({ _id: objectIdGameId });
    if (!game) {
      throw new Error('Game not found');
    }
    
    // Check if player is already in game
    const existingPlayer = game.players.find(p => p.playerId === playerData.playerId);
    if (existingPlayer) {
      throw new Error('Player already in game');
    }
    
    // Check if game is full
    if (game.players.length >= game.settings.maxPlayers) {
      throw new Error('Game is full');
    }
    
    const newPlayer = {
      playerId: playerData.playerId,
      username: playerData.username,
      chips: game.settings.startingChips,
      seatNumber: playerData.seatNumber,
      isReady: false,
      cards: [],
      currentBet: 0,
      folded: false,
      allIn: false,
      isDealer: false,
      isSmallBlind: false,
      isBigBlind: false,
      hasActed: false,
      joinedAt: new Date()
    };
    
    const result = await collection.updateOne(
      { _id: objectIdGameId },
      { 
        $push: { players: newPlayer },
        $set: { updatedAt: new Date() }
      }
    );
    
    return result;
  } catch (error) {
    console.error('Error adding player to game:', error);
    throw new Error('Failed to add player to game');
  }
}

// Remove player from game
export async function removePlayerFromGame(gameId, playerId) {
  try {
    const client = await clientPromise;
    const db = client.db('Poker');
    const collection = db.collection('games');
    
    let objectIdGameId;
    try {
      objectIdGameId = typeof gameId === 'string' ? new ObjectId(gameId) : gameId;
    } catch (err) {
      console.error('Invalid ObjectId format:', gameId);
      return { modifiedCount: 0 };
    }
    
    const result = await collection.updateOne(
      { _id: objectIdGameId },
      { 
        $pull: { players: { playerId: playerId } },
        $set: { updatedAt: new Date() }
      }
    );
    
    return result;
  } catch (error) {
    console.error('Error removing player from game:', error);
    throw new Error('Failed to remove player from game');
  }
}

// Update game state (for in-game actions)
export async function updateGameState(gameId, gameState) {
  try {
    const client = await clientPromise;
    const db = client.db('Poker');
    const collection = db.collection('games');
    
    let objectIdGameId;
    try {
      objectIdGameId = typeof gameId === 'string' ? new ObjectId(gameId) : gameId;
    } catch (err) {
      console.error('Invalid ObjectId format:', gameId);
      return { modifiedCount: 0 };
    }
    
    const result = await collection.updateOne(
      { _id: objectIdGameId },
      { 
        $set: { 
          gameState: gameState,
          updatedAt: new Date()
        }
      }
    );
    
    return result;
  } catch (error) {
    console.error('Error updating game state:', error);
    throw new Error('Failed to update game state');
  }
}

// Add hand to history
export async function addHandToHistory(gameId, handData) {
  try {
    const client = await clientPromise;
    const db = client.db('Poker');
    const collection = db.collection('games');
    
    let objectIdGameId;
    try {
      objectIdGameId = typeof gameId === 'string' ? new ObjectId(gameId) : gameId;
    } catch (err) {
      console.error('Invalid ObjectId format:', gameId);
      return { modifiedCount: 0 };
    }
    
    const handRecord = {
      handNumber: handData.handNumber,
      timestamp: new Date(),
      players: handData.players,
      communityCards: handData.communityCards,
      pot: handData.pot,
      winner: handData.winner,
      actions: handData.actions || []
    };
    
    const result = await collection.updateOne(
      { _id: objectIdGameId },
      { 
        $push: { handHistory: handRecord },
        $inc: { currentHand: 1 },
        $set: { updatedAt: new Date() }
      }
    );
    
    return result;
  } catch (error) {
    console.error('Error adding hand to history:', error);
    throw new Error('Failed to add hand to history');
  }
}

// Delete a game
export async function deleteGame(gameId) {
  try {
    const client = await clientPromise;
    const db = client.db('Poker');
    const collection = db.collection('games');
    
    let objectIdGameId;
    try {
      objectIdGameId = typeof gameId === 'string' ? new ObjectId(gameId) : gameId;
    } catch (err) {
      console.error('Invalid ObjectId format:', gameId);
      return { deletedCount: 0 };
    }
    
    const result = await collection.deleteOne({ _id: objectIdGameId });
    return result;
  } catch (error) {
    console.error('Error deleting game:', error);
    throw new Error('Failed to delete game');
  }
} 