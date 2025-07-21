interface PlayingCardProps {
    card: string
    small?: boolean
  }
  
  export default function PlayingCard({ card, small = false }: PlayingCardProps) {
    const [rank, suit] = card.split("")
  
    const getSuitSymbol = (suit: string) => {
      switch (suit) {
        case "H":
          return "♥"
        case "D":
          return "♦"
        case "C":
          return "♣"
        case "S":
          return "♠"
        default:
          return suit
      }
    }
  
    const getSuitColor = (suit: string) => {
      return suit === "H" || suit === "D" ? "text-red-500" : "text-black"
    }
  
    const getRankDisplay = (rank: string) => {
      switch (rank) {
        case "T":
          return "10"
        case "J":
          return "J"
        case "Q":
          return "Q"
        case "K":
          return "K"
        case "A":
          return "A"
        default:
          return rank
      }
    }
  
    const cardSize = small ? "w-12 h-16 text-xs" : "w-16 h-24 text-sm"
  
    return (
      <div
        className={`${cardSize} bg-white rounded-lg border border-gray-300 flex flex-col justify-between p-1 shadow-md`}
      >
        <div className={`${getSuitColor(suit)} font-bold text-left`}>
          <div>{getRankDisplay(rank)}</div>
          <div className="text-center">{getSuitSymbol(suit)}</div>
        </div>
        <div className={`${getSuitColor(suit)} font-bold text-right rotate-180`}>
          <div>{getRankDisplay(rank)}</div>
          <div className="text-center">{getSuitSymbol(suit)}</div>
        </div>
      </div>
    )
  }
  