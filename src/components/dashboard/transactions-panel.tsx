"use client"

import { useState, useMemo, useEffect } from "react"
import { ChevronRight, X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TransactionRow } from "@/components/dashboard/transaction-row"
import { TransactionsToolbar } from "@/components/dashboard/transactions-toolbar"
import { TransactionFilterPopover } from "@/components/dashboard/transaction-filters"
import { FilterChips } from "@/components/dashboard/filter-chips"
import {
  applyBaseFilter,
  searchTransactions,
  filterTransactions,
  sortTransactions,
} from "@/lib/transaction-filters"
import type { SortOption, TransactionFilters } from "@/lib/transaction-filters"
import type { TransactionWithAccount } from "@/lib/queries/transactions"
import { formatCurrency } from "@/lib/plaid-amounts"

interface TransactionsPanelProps {
  transactions: TransactionWithAccount[]
  accounts: { id: string; name: string }[]
  onLoadMore?: () => void
  hasMore?: boolean
}

function getActiveFilterCount(filters: TransactionFilters): number {
  let count = 0
  if (filters.dateRange) count++
  if (filters.category !== undefined) count++
  if (filters.amountMin !== undefined || filters.amountMax !== undefined) count++
  if (filters.accountId !== undefined) count++
  return count
}

function daysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

const NON_SPENDING_CATEGORIES = new Set([
  "TRANSFER_OUT", "TRANSFER_IN", "LOAN_PAYMENTS", "INCOME",
])

function sumSpendingInDays(
  transactions: TransactionWithAccount[],
  days: number
): number {
  const cutoff = daysAgo(days)
  return transactions
    .filter((t) => t.date >= cutoff && t.amount > 0 && !NON_SPENDING_CATEGORIES.has(t.category_primary ?? ""))
    .reduce((sum, t) => sum + t.amount, 0)
}

function getUniqueCategories(
  transactions: TransactionWithAccount[]
): string[] {
  const cats = new Set<string>()
  transactions.forEach((t) => {
    if (t.category_primary) cats.add(t.category_primary)
  })
  return Array.from(cats).sort()
}

const PREVIEW_COUNT = 5

export function TransactionsPanel({
  transactions,
  accounts,
  onLoadMore,
  hasMore = false,
}: TransactionsPanelProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [searchInput, setSearchInput] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState<TransactionFilters>({})
  const [sortOption, setSortOption] = useState<SortOption>("date-desc")
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Base filtered (removes pending etc.)
  const baseTransactions = useMemo(
    () => applyBaseFilter(transactions),
    [transactions]
  )

  // Full filtering pipeline (for modal)
  const filteredTransactions = useMemo(() => {
    let result = baseTransactions
    result = searchTransactions(result, searchTerm)
    result = filterTransactions(result, filters)
    result = sortTransactions(result, sortOption)
    return result
  }, [baseTransactions, searchTerm, filters, sortOption])

  const totalCount = baseTransactions.length
  const activeFilterCount = getActiveFilterCount(filters)
  const hasActiveFilters = activeFilterCount > 0 || searchTerm.length > 0
  const categories = useMemo(
    () => getUniqueCategories(transactions),
    [transactions]
  )

  // Preview: most recent 5
  const previewTransactions = useMemo(
    () => sortTransactions(baseTransactions, "date-desc").slice(0, PREVIEW_COUNT),
    [baseTransactions]
  )
  const spending7Days = sumSpendingInDays(baseTransactions, 7)

  const handleRemoveFilter = (key: keyof TransactionFilters) => {
    const next = { ...filters }
    delete next[key]
    setFilters(next)
  }

  // Reset filters when modal closes
  const handleModalOpenChange = (open: boolean) => {
    setModalOpen(open)
    if (!open) {
      setSearchInput("")
      setSearchTerm("")
      setFilters({})
      setSortOption("date-desc")
      setFilterPopoverOpen(false)
    }
  }

  // Loading skeleton
  if (transactions.length === 0) {
    return (
      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-40" />
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-1 py-3">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-16" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    )
  }

  return (
    <>
      {/* Inline preview card */}
      <Card>
        <div className="px-4 pt-4">
          {previewTransactions.map((txn) => (
            <TransactionRow key={txn.id} transaction={txn} />
          ))}
        </div>

        {/* Footer with spending summary + expand button */}
        <div className="px-4 py-3 border-t border-border flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {formatCurrency(spending7Days)} in the last 7 days
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="text-sm text-muted-foreground hover:text-foreground gap-1"
            onClick={() => setModalOpen(true)}
          >
            View All ({totalCount})
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Full transactions modal */}
      <Dialog open={modalOpen} onOpenChange={handleModalOpenChange}>
        <DialogContent
          className="sm:max-w-3xl max-h-[90vh] flex flex-col"
          showCloseButton={false}
        >
          {/* Header */}
          <DialogHeader className="flex flex-row items-center justify-between shrink-0">
            <DialogTitle className="text-lg font-semibold">
              {hasActiveFilters
                ? `Showing ${filteredTransactions.length} of ${totalCount} transactions`
                : `All Transactions (${totalCount})`}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setModalOpen(false)}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </DialogHeader>

          {/* Toolbar */}
          <div className="shrink-0">
            <TransactionsToolbar
              searchValue={searchInput}
              onSearchChange={setSearchInput}
              onFilterClick={() => setFilterPopoverOpen(!filterPopoverOpen)}
              activeFilterCount={activeFilterCount}
              sortOption={sortOption}
              onSortChange={setSortOption}
            />

            <TransactionFilterPopover
              filters={filters}
              onFiltersChange={setFilters}
              categories={categories}
              accounts={accounts}
              open={filterPopoverOpen}
              onOpenChange={setFilterPopoverOpen}
            />

            {activeFilterCount > 0 && (
              <FilterChips
                filters={filters}
                onRemove={handleRemoveFilter}
                categories={categories}
                accounts={accounts}
              />
            )}
          </div>

          {/* Scrollable transaction list */}
          <div className="flex-1 overflow-y-auto min-h-0 px-1">
            {filteredTransactions.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No transactions found
              </div>
            ) : (
              filteredTransactions.map((txn) => (
                <TransactionRow key={txn.id} transaction={txn} />
              ))
            )}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="shrink-0 pt-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={onLoadMore}
              >
                Load more
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
