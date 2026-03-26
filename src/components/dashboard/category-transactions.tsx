"use client"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { formatCurrency } from "@/lib/plaid-amounts"
import { getCategoryColor } from "@/lib/chart-colors"
import type { Transaction } from "@/lib/queries/types"

interface CategoryTransactionsProps {
  category: string
  categoryLabel: string
  total: number
  transactions: Transaction[]
  open: boolean
  onClose: () => void
}

export function CategoryTransactions({
  category,
  categoryLabel,
  total,
  transactions,
  open,
  onClose,
}: CategoryTransactionsProps) {
  const sorted = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-sm shrink-0"
              style={{ backgroundColor: getCategoryColor(category) }}
            />
            {categoryLabel}
          </SheetTitle>
          <SheetDescription>
            {formatCurrency(total)} spent &middot; {sorted.length} transaction
            {sorted.length !== 1 ? "s" : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-4 space-y-2">
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No transactions found
            </p>
          ) : (
            sorted.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between py-2 border-b border-border/40 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {t.merchant_name ?? t.name ?? "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(t.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span className="text-sm font-medium tabular-nums ml-3">
                  {formatCurrency(t.amount)}
                </span>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
