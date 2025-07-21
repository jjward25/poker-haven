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
    <>
      {/* Mobile: Static content in flow */}
      <div className="block sm:hidden w-full mt-4">
        <Card className="bg-white border-2 border-blue-500 shadow-lg">
          <CardContent className="p-3">
            <div className="text-center">
              <h3 className="font-bold text-blue-600 mb-2 text-base">Your Hand</h3>
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

      {/* Desktop: Fixed floating modal */}
      <div className="hidden sm:block fixed bottom-20 left-1/2 transform -translate-x-1/2 z-20 w-full max-w-sm">
        <Card className="bg-white border-4 border-blue-500 shadow-2xl">
          <CardContent className="p-4">
            <div className="text-center">
              <h3 className="font-bold text-blue-600 mb-2 text-base">Your Hand</h3>
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
    </>
  )
} 