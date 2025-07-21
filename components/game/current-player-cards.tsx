"use client"

import PlayingCard from "@/components/playing-card"
import { Card, CardContent } from "@/components/ui/card"

interface CurrentPlayerCardsProps {
  cards: string[]
  playerName: string
  chips: number
}

export default function CurrentPlayerCards({ cards, playerName, chips }: CurrentPlayerCardsProps) {
  if (!cards || cards.length === 0) {
    return null
  }

  return (
    <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-20">
      <Card className="bg-white border-4 border-blue-500 shadow-2xl">
        <CardContent className="p-4">
          <div className="text-center">
            <h3 className="font-bold text-blue-600 mb-2">Your Hand</h3>
            <div className="flex justify-center gap-3 mb-2">
              {cards.map((card, index) => (
                <PlayingCard key={index} card={card} />
              ))}
            </div>
            <div className="text-sm text-muted-foreground">
              {playerName} • ${chips.toLocaleString()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 