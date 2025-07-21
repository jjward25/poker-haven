"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Player {
  _id: string
  username: string
  stats: {
    gamesPlayed: number
    handsDealt: number
    handsPlayed: number
    handsWon: number
    totalWinnings: number
    totalLosses: number
    netEarnings: number
    winPercentage: number
  }
  gameHistory: Array<{
    gameId: string
    date: string
    handsPlayed: number
    handsWon: number
    netEarnings: number
  }>
}

interface AuthFormProps {
  onAuthSuccess: (player: Player) => void
}

export default function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!username || !password) {
      setError("Username and password are required")
      return
    }

    if (isSignUp && password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 3) {
      setError("Password must be at least 3 characters long")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/players", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: isSignUp ? "signup" : "signin",
          username,
          password,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        if (isSignUp) {
          // After successful signup, automatically sign in
          const signInResponse = await fetch("/api/players", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action: "signin",
              username,
              password,
            }),
          })

          const signInData = await signInResponse.json()
          
          if (signInResponse.ok) {
            onAuthSuccess(signInData.player)
          } else {
            setError(signInData.error || "Failed to sign in after signup")
          }
        } else {
          onAuthSuccess(data.player)
        }
      } else {
        setError(data.error || "Authentication failed")
      }
    } catch (error) {
      setError("Network error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-green-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            {isSignUp ? "Join Poker Haven" : "Welcome Back"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={loading}
              />
            </div>

            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  disabled={loading}
                />
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Please wait..." : isSignUp ? "Sign Up" : "Sign In"}
            </Button>
          </form>

          <div className="text-center">
            <Button
              variant="link"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError("")
                setConfirmPassword("")
              }}
              disabled={loading}
            >
              {isSignUp
                ? "Already have an account? Sign In"
                : "Need an account? Sign Up"}
            </Button>
          </div>

          {isSignUp && (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Create your poker account to track your stats</p>
              <p>• Join games with friends</p>
              <p>• Build your poker reputation</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 