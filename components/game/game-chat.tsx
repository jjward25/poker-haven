"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Send, MessageCircle, Minimize2 } from "lucide-react"

interface ChatMessage {
  id: string
  gameId: string
  playerId: string
  username: string
  message: string
  timestamp: Date
  isBot?: boolean
}

interface GameChatProps {
  gameId: string
  currentPlayer: {
    _id: string
    username: string
  }
}

export default function GameChat({ gameId, currentPlayer }: GameChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isMinimized, setIsMinimized] = useState(false)
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, 3000) // Poll for new messages
    return () => clearInterval(interval)
  }, [gameId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/chat?gameId=${gameId}`)
      const data = await response.json()

      if (response.ok) {
        setMessages(data)
      }
    } catch (error) {
      console.error("Failed to fetch messages")
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim()) return

    setLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameId,
          playerId: currentPlayer._id,
          username: currentPlayer.username,
          message: newMessage.trim()
        }),
      })

      if (response.ok) {
        setNewMessage("")
        await fetchMessages() // Refresh messages
      }
    } catch (error) {
      console.error("Failed to send message")
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  // Use CSS to handle mobile vs desktop layout instead of JS detection
  // This prevents hydration issues and is more reliable

  if (isMinimized) {
    // Desktop: minimized floating button
    return (
      <div className="fixed bottom-2 sm:bottom-4 right-2 sm:right-4 z-10">
        <Button
          onClick={() => setIsMinimized(false)}
          className="rounded-full w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 hover:bg-blue-700"
        >
          <MessageCircle className="w-4 h-4 sm:w-6 sm:h-6" />
        </Button>
      </div>
    )
  }

  return (
    <>
      {/* Mobile Layout: Static content */}
      <div className="block sm:hidden w-full">
        <Card className="h-64">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <MessageCircle className="w-4 h-4" />
              Game Chat
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 flex flex-col h-full">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto mb-3 space-y-2 max-h-32">
              {messages.length === 0 ? (
                <p className="text-sm text-gray-500 text-center">No messages yet</p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`text-sm ${
                      msg.playerId === currentPlayer._id
                        ? "text-right"
                        : "text-left"
                    }`}
                  >
                    <div
                      className={`inline-block max-w-[80%] px-2 py-1 rounded ${
                        msg.playerId === currentPlayer._id
                          ? "bg-blue-500 text-white"
                          : msg.isBot 
                          ? "bg-gray-200 text-gray-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      <div className="font-medium text-xs opacity-75">
                        {msg.username} {msg.isBot && "(Bot)"}
                      </div>
                      <div>{msg.message}</div>
                      <div className="text-xs opacity-75 mt-1">
                        {formatTime(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={sendMessage} className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                disabled={loading}
                className="flex-1 min-h-10"
                maxLength={200}
              />
              <Button 
                type="submit" 
                disabled={loading || !newMessage.trim()}
                size="sm"
                className="min-h-10 px-3"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Desktop Layout: Floating widget */}
      <div className="hidden sm:block fixed bottom-2 sm:bottom-4 right-2 sm:right-4 w-72 sm:w-80 z-10">
        <Card className="h-80 sm:h-96">
          <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
            <CardTitle className="flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-1 sm:gap-2">
                <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Game Chat</span>
                <span className="sm:hidden">Chat</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(true)}
                className="h-6 w-6 p-0"
              >
                <Minimize2 className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 flex flex-col h-80">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-2">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-4">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`text-sm ${
                      msg.playerId === currentPlayer._id
                        ? "text-right"
                        : "text-left"
                    }`}
                  >
                    <div
                      className={`inline-block max-w-[80%] px-2 py-1 rounded ${
                        msg.playerId === currentPlayer._id
                          ? "bg-blue-500 text-white"
                          : msg.isBot 
                          ? "bg-gray-200 text-gray-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      <div className="font-medium text-xs opacity-75">
                        {msg.username} {msg.isBot && "(Bot)"}
                      </div>
                      <div>{msg.message}</div>
                      <div className="text-xs opacity-75 mt-1">
                        {formatTime(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={sendMessage} className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                disabled={loading}
                className="flex-1"
                maxLength={200}
              />
              <Button 
                type="submit" 
                size="sm"
                disabled={loading || !newMessage.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
} 