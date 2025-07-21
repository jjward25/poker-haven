export function createDeck(): string[] {
    const suits = ["H", "D", "C", "S"]
    const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"]
    const deck: string[] = []
  
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push(rank + suit)
      }
    }
  
    return deck
  }
  
  export function shuffleDeck(deck: string[]): string[] {
    const shuffled = [...deck]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }
  
  export function dealCards(players: any[], deck: string[]) {
    const newDeck = [...deck]
    const updatedPlayers = players.map((player) => ({
      ...player,
      cards: [newDeck.shift()!, newDeck.shift()!],
    }))
  
    return { players: updatedPlayers, remainingDeck: newDeck }
  }
  
  export interface HandRank {
    rank: number
    description: string
    kickers: number[]
  }
  
  export function evaluateHand(cards: string[]): HandRank {
    const ranks = cards.map((card) => {
      const rank = card[0]
      switch (rank) {
        case "A":
          return 14
        case "K":
          return 13
        case "Q":
          return 12
        case "J":
          return 11
        case "T":
          return 10
        default:
          return Number.parseInt(rank)
      }
    })
  
    const suits = cards.map((card) => card[1])
  
    // Count ranks
    const rankCounts: { [key: number]: number } = {}
    ranks.forEach((rank) => {
      rankCounts[rank] = (rankCounts[rank] || 0) + 1
    })
  
    const sortedRanks = Object.keys(rankCounts)
      .map(Number)
      .sort((a, b) => b - a)
  
    const counts = Object.values(rankCounts).sort((a, b) => b - a)
  
    // Check for flush
    const isFlush = suits.every((suit) => suit === suits[0])
  
    // Check for straight
    const uniqueRanks = [...new Set(ranks)].sort((a, b) => b - a)
    let isStraight = false
    let straightHigh = 0
  
    if (uniqueRanks.length >= 5) {
      for (let i = 0; i <= uniqueRanks.length - 5; i++) {
        if (uniqueRanks[i] - uniqueRanks[i + 4] === 4) {
          isStraight = true
          straightHigh = uniqueRanks[i]
          break
        }
      }
  
      // Check for A-2-3-4-5 straight (wheel)
      if (
        !isStraight &&
        uniqueRanks.includes(14) &&
        uniqueRanks.includes(5) &&
        uniqueRanks.includes(4) &&
        uniqueRanks.includes(3) &&
        uniqueRanks.includes(2)
      ) {
        isStraight = true
        straightHigh = 5
      }
    }
  
    // Determine hand rank
    if (isStraight && isFlush) {
      if (straightHigh === 14) {
        return { rank: 10, description: "Royal Flush", kickers: [straightHigh] }
      }
      return { rank: 9, description: "Straight Flush", kickers: [straightHigh] }
    }
  
    if (counts[0] === 4) {
      const fourKind = sortedRanks.find((rank) => rankCounts[rank] === 4)!
      const kicker = sortedRanks.find((rank) => rankCounts[rank] === 1)!
      return { rank: 8, description: "Four of a Kind", kickers: [fourKind, kicker] }
    }
  
    if (counts[0] === 3 && counts[1] === 2) {
      const threeKind = sortedRanks.find((rank) => rankCounts[rank] === 3)!
      const pair = sortedRanks.find((rank) => rankCounts[rank] === 2)!
      return { rank: 7, description: "Full House", kickers: [threeKind, pair] }
    }
  
    if (isFlush) {
      return { rank: 6, description: "Flush", kickers: sortedRanks.slice(0, 5) }
    }
  
    if (isStraight) {
      return { rank: 5, description: "Straight", kickers: [straightHigh] }
    }
  
    if (counts[0] === 3) {
      const threeKind = sortedRanks.find((rank) => rankCounts[rank] === 3)!
      const kickers = sortedRanks.filter((rank) => rankCounts[rank] === 1).slice(0, 2)
      return { rank: 4, description: "Three of a Kind", kickers: [threeKind, ...kickers] }
    }
  
    if (counts[0] === 2 && counts[1] === 2) {
      const pairs = sortedRanks.filter((rank) => rankCounts[rank] === 2).sort((a, b) => b - a)
      const kicker = sortedRanks.find((rank) => rankCounts[rank] === 1)!
      return { rank: 3, description: "Two Pair", kickers: [...pairs, kicker] }
    }
  
    if (counts[0] === 2) {
      const pair = sortedRanks.find((rank) => rankCounts[rank] === 2)!
      const kickers = sortedRanks.filter((rank) => rankCounts[rank] === 1).slice(0, 3)
      return { rank: 2, description: "One Pair", kickers: [pair, ...kickers] }
    }
  
    return { rank: 1, description: "High Card", kickers: sortedRanks.slice(0, 5) }
  }
  
  export function compareHands(hand1: HandRank, hand2: HandRank): number {
    if (hand1.rank !== hand2.rank) {
      return hand1.rank - hand2.rank
    }
  
    // Compare kickers
    for (let i = 0; i < Math.max(hand1.kickers.length, hand2.kickers.length); i++) {
      const kicker1 = hand1.kickers[i] || 0
      const kicker2 = hand2.kickers[i] || 0
      if (kicker1 !== kicker2) {
        return kicker1 - kicker2
      }
    }
  
    return 0 // Tie
  }
  