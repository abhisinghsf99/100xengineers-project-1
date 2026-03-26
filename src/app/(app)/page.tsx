"use client"

import { useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { SummaryCards } from "@/components/dashboard/summary-cards"
import { AccountCards } from "@/components/dashboard/account-cards"
import { PaymentCalculator } from "@/components/dashboard/payment-calculator"
import { TransactionsPanel } from "@/components/dashboard/transactions-panel"
import { RecurringPanel } from "@/components/dashboard/recurring-panel"
import { ChatFABWrapper } from "@/components/chat/chat-fab-wrapper"
import { useDashboardStore } from "@/lib/store/dashboard-store"

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <section>
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-[300px] rounded-lg" />
      </section>
      <section>
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-[100px] rounded-lg" />
          <Skeleton className="h-[100px] rounded-lg" />
        </div>
      </section>
      <section>
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-[300px] rounded-lg" />
      </section>
    </div>
  )
}

export default function DashboardPage() {
  const {
    accounts,
    transactions,
    isLoaded,
    isLoading,
    error,
    loadDashboard,
  } = useDashboardStore()

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  // Staleness check: re-fetch every 15 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboard()
    }, 15 * 60 * 1000)
    return () => clearInterval(interval)
  }, [loadDashboard])

  if (!isLoaded && isLoading) {
    return <DashboardSkeleton />
  }

  if (error && !isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-400 mb-2">Failed to load dashboard</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            className="mt-4 px-4 py-2 rounded bg-primary text-primary-foreground text-sm"
            onClick={() => loadDashboard()}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const accountsList = accounts.map((a) => ({
    id: a.id,
    name: a.name || a.official_name || "Account",
  }))

  return (
    <div className="space-y-8">
      {/* Summary Section */}
      <section id="summary" className="scroll-mt-16">
        <h2 className="text-xl font-semibold mb-4">Spending Summary</h2>
        <SummaryCards transactions={transactions} />
      </section>

      {/* Accounts Section */}
      <section id="accounts" className="scroll-mt-16">
        <h2 className="text-xl font-semibold mb-4">Accounts</h2>
        <AccountCards accounts={accounts} />
      </section>

      {/* Payoff Planner Section */}
      <section id="payoff-planner" className="scroll-mt-16">
        <h2 className="text-xl font-semibold mb-4">Payoff Planner</h2>
        <PaymentCalculator />
      </section>

      {/* Transactions Section */}
      <section id="transactions" className="scroll-mt-16">
        <h2 className="text-xl font-semibold mb-4">Transactions</h2>
        <TransactionsPanel
          transactions={transactions}
          accounts={accountsList}
        />
      </section>

      {/* Recurring Section */}
      <section id="recurring" className="scroll-mt-16">
        <h2 className="text-xl font-semibold mb-4">Recurring Charges</h2>
        <RecurringPanel transactions={transactions} />
      </section>

      {/* Chat anchor for mobile nav scroll */}
      <div id="chat" className="scroll-mt-16" />

      {/* Chat FAB - client-side only */}
      <ChatFABWrapper />
    </div>
  )
}
