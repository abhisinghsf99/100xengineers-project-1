"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

export default function LoginPage() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [shake, setShake] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        router.push("/")
        router.refresh()
      } else {
        setShake(true)
        setError("Incorrect password")
        setTimeout(() => setShake(false), 500)
      }
    } catch {
      setShake(true)
      setError("Something went wrong")
      setTimeout(() => setShake(false), 500)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card
        className={cn(
          "w-full max-w-sm shadow-lg",
          shake && "animate-shake"
        )}
      >
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Finance Tracker
          </CardTitle>
          <p className="text-xs text-muted-foreground/70 mb-1">Sandbox Demo</p>
          <p className="text-sm text-muted-foreground">
            Enter your password to continue
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                className={cn(
                  error && "border-destructive focus-visible:ring-destructive"
                )}
              />
              {error && (
                <p className="text-sm text-destructive font-medium">
                  {error}
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !password}
            >
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
