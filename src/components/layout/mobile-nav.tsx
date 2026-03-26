"use client"

import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  MessageSquare,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  href: string
  icon: LucideIcon
  label: string
}

const navItems: NavItem[] = [
  { href: "#summary", icon: LayoutDashboard, label: "Summary" },
  { href: "#accounts", icon: Wallet, label: "Accounts" },
  { href: "#transactions", icon: ArrowLeftRight, label: "Transactions" },
  { href: "#chat", icon: MessageSquare, label: "Chat" },
]

export function MobileNav({ className }: { className?: string }) {
  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden",
        className
      )}
    >
      <div className="flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom,0px)] pt-2">
        {navItems.map((item) => {
          const Icon = item.icon

          // Chat tab dispatches custom event instead of anchor scroll
          if (item.href === "#chat") {
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("open-chat"))}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-muted-foreground transition-colors duration-200 hover:text-primary cursor-pointer"
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            )
          }

          return (
            <a
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-muted-foreground transition-colors duration-200 hover:text-primary"
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </a>
          )
        })}
      </div>
    </nav>
  )
}
