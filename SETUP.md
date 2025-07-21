# Poker Haven Setup Guide

## Environment Configuration

To run Poker Haven, you need to set up a MongoDB database connection.

### 1. Create Environment File

Create a `.env.local` file in the root directory with the following content:

```bash
# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/Poker?retryWrites=true&w=majority
```

### 2. MongoDB Setup Options

#### Option A: MongoDB Atlas (Recommended - Free)

1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Create a free account and cluster
3. Create a database user with read/write permissions
4. Whitelist your IP address (or use 0.0.0.0/0 for development)
5. Get your connection string from the "Connect" button
6. Replace the MONGODB_URI in your `.env.local` file

#### Option B: Local MongoDB

If you have MongoDB installed locally:

```bash
MONGODB_URI=mongodb://localhost:27017/Poker
```

### 3. Database Structure

The application will automatically create the following collections:
- `players` - User accounts and statistics
- `games` - Game rooms and state

### 4. Run the Application

```bash
npm run dev
```

## Features

### Authentication System
- Sign up with username/password
- Sign in to existing account
- User statistics tracking

### Game Management
- Create custom games with settings:
  - Starting chip count
  - Custom chip breakdown
  - Blind structure and increases
  - Straddling on/off
  - Maximum players (2-10)
- Join existing games
- Real-time game updates

### Poker Game Features
- Fair card dealing using secure random deck shuffling
- Hidden opponent cards (only shown at showdown)
- Turn-based gameplay with proper betting rounds
- Automatic hand evaluation and winner determination
- Complete hand history tracking
- Player statistics (games played, win rate, earnings)

### Security Features
- Cards are dealt server-side for fairness
- Game state is stored in database
- Real-time synchronization between players
- Proper turn management and validation

## Troubleshooting

### MongoDB Connection Issues
- Ensure your IP is whitelisted in MongoDB Atlas
- Check that your username/password are correct
- Verify the database name in the connection string

### Application Issues
- Make sure all dependencies are installed: `npm install`
- Check that your `.env.local` file exists and has the correct MONGODB_URI
- Restart the development server after adding environment variables 