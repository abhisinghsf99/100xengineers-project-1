"use client"

import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"
import type { Transaction } from "@/lib/queries/types"

const SpendingChart = dynamic(
  () => import("@/components/dashboard/spending-chart"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[300px] w-full rounded-lg" />,
  }
)

const CategoryChart = dynamic(
  () => import("@/components/dashboard/category-chart"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[300px] w-full rounded-lg" />,
  }
)

interface ChartsSectionProps {
  monthlySpending: { month: string; total: number; count: number }[]
  categorySpending: { category: string; total: number; count: number }[]
  yearMonth: string
  transactions: Transaction[]
}

export function ChartsSection({
  monthlySpending,
  categorySpending,
  yearMonth,
  transactions,
}: ChartsSectionProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Monthly Trend
        </h3>
        <SpendingChart data={monthlySpending} />
      </div>
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          By Category
        </h3>
        <CategoryChart
          data={categorySpending}
          yearMonth={yearMonth}
          transactions={transactions}
        />
      </div>
    </div>
  )
}
