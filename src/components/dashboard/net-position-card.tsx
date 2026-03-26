"use client"

import { useMemo } from "react"
import { formatCurrency } from "@/lib/plaid-amounts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet } from "lucide-react"
import type { Account } from "@/lib/queries/types"

interface NetPositionCardProps {
  accounts: Account[]
}

export function NetPositionCard({ accounts }: NetPositionCardProps) {
  const { cash, credit, loans, netPosition, isPositive } = useMemo(() => {
    const cashTotal = accounts
      .filter((a) => a.type === "depository")
      .reduce((sum, a) => sum + (a.balance_current ?? 0), 0)

    const creditTotal = accounts
      .filter((a) => a.type === "credit")
      .reduce((sum, a) => sum + (a.balance_current ?? 0), 0)

    const loanTotal = accounts
      .filter((a) => a.type === "loan")
      .reduce((sum, a) => sum + (a.balance_current ?? 0), 0)

    const net = cashTotal - creditTotal - loanTotal

    return {
      cash: cashTotal,
      credit: creditTotal,
      loans: loanTotal,
      netPosition: net,
      isPositive: net >= 0,
    }
  }, [accounts])

  return (
    <Card className="border-border/40">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Net Position
        </CardTitle>
        <Wallet className="h-4 w-4 text-teal-400" />
      </CardHeader>
      <CardContent>
        <div
          className={`text-2xl font-bold ${
            isPositive ? "text-green-400" : "text-red-400"
          }`}
        >
          {isPositive ? "" : "-"}
          {formatCurrency(netPosition)}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Cash: {formatCurrency(cash)} | Credit: {formatCurrency(credit)}
          {loans > 0 ? ` | Loans: ${formatCurrency(loans)}` : ""}
        </p>
      </CardContent>
    </Card>
  )
}

export default NetPositionCard
