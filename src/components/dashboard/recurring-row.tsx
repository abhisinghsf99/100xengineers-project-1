"use client"

import type { RecurringCharge } from "@/lib/recurring-detection"
import { formatCurrency } from "@/lib/plaid-amounts"
import { Badge } from "@/components/ui/badge"

interface RecurringRowProps {
  charge: RecurringCharge
}

const frequencyLabels: Record<RecurringCharge["frequency"], string> = {
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
  yearly: "Yearly",
}

export function RecurringRow({ charge }: RecurringRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
      <span className="font-medium text-foreground truncate mr-2">
        {charge.merchantName}
      </span>
      <div className="flex items-center gap-2 shrink-0">
        <span className="font-medium text-foreground">
          {formatCurrency(charge.amount)}
        </span>
        <Badge variant="outline" className="text-xs">
          {frequencyLabels[charge.frequency]}
        </Badge>
        <span className="text-xs text-muted-foreground w-8 text-right">
          {charge.chargeCount}x
        </span>
      </div>
    </div>
  )
}
