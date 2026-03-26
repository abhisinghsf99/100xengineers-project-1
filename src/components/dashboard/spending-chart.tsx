"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatCurrency } from "@/lib/plaid-amounts"

interface SpendingChartProps {
  data: { month: string; total: number; count: number }[]
}

const chartConfig = {
  total: {
    label: "Spending",
    color: "hsl(174, 55%, 50%)",
  },
} satisfies ChartConfig

function formatAxisCurrency(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`
  }
  return `$${value}`
}

export default function SpendingChart({ data }: SpendingChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[250px] text-muted-foreground">
        No spending data available
      </div>
    )
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="min-h-[250px] md:min-h-[300px] w-full"
    >
      <BarChart data={data} accessibilityLayer>
        <CartesianGrid
          vertical={false}
          strokeDasharray="3 3"
          stroke="hsl(215, 15%, 25%)"
        />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "hsl(215, 15%, 60%)", fontSize: 12 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={formatAxisCurrency}
          tick={{ fill: "hsl(215, 15%, 60%)", fontSize: 12 }}
          width={55}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => formatCurrency(value as number)}
            />
          }
        />
        <Bar
          dataKey="total"
          fill="var(--color-total)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  )
}
