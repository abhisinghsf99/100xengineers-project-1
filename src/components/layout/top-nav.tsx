"use client"

import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDashboardStore } from "@/lib/store/dashboard-store"

export function TopNav() {
  const router = useRouter()

  async function handleSignOut() {
    useDashboardStore.getState().clear()
    await fetch("/api/auth", { method: "DELETE" })
    window.location.href = "/login"
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <span className="text-lg font-bold text-primary">Finance Tracker</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </header>
  )
}
