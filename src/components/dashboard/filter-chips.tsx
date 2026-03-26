"use client"

import { X } from "lucide-react"
import type { TransactionFilters } from "@/lib/transaction-filters"

interface FilterChipsProps {
  filters: TransactionFilters
  onRemove: (filterKey: keyof TransactionFilters) => void
  categories: string[]
  accounts: { id: string; name: string }[]
}

function formatCategoryName(category: string): string {
  return category
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function FilterChips({
  filters,
  onRemove,
  categories,
  accounts,
}: FilterChipsProps) {
  const chips: { key: keyof TransactionFilters; label: string }[] = []

  if (filters.dateRange?.start || filters.dateRange?.end) {
    const start = filters.dateRange.start
      ? formatDate(filters.dateRange.start)
      : "..."
    const end = filters.dateRange.end
      ? formatDate(filters.dateRange.end)
      : "..."
    chips.push({ key: "dateRange", label: `${start} - ${end}` })
  }

  if (filters.category) {
    chips.push({
      key: "category",
      label: formatCategoryName(filters.category),
    })
  }

  if (filters.amountMin !== undefined || filters.amountMax !== undefined) {
    const min = filters.amountMin !== undefined ? `$${filters.amountMin}` : "..."
    const max = filters.amountMax !== undefined ? `$${filters.amountMax}` : "..."
    chips.push({ key: "amountMin", label: `${min} - ${max}` })
  }

  if (filters.accountId) {
    const account = accounts.find((a) => a.id === filters.accountId)
    chips.push({
      key: "accountId",
      label: account?.name ?? "Unknown Account",
    })
  }

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 px-4 py-2">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-900/30 text-cyan-400 text-xs font-medium border border-cyan-800/50"
        >
          {chip.label}
          <button
            onClick={() => {
              // For amount range, removing the chip clears both min and max
              if (chip.key === "amountMin") {
                onRemove("amountMin")
                onRemove("amountMax")
              } else {
                onRemove(chip.key)
              }
            }}
            className="ml-0.5 hover:text-white transition-colors"
            aria-label={`Remove ${chip.label} filter`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  )
}
