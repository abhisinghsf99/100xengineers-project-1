import type { Transaction } from "@/lib/queries/types"

export interface TransactionFilters {
  dateRange?: { start: string; end: string }
  category?: string
  amountMin?: number
  amountMax?: number
  accountId?: string
}

export type SortOption =
  | "date-desc"
  | "date-asc"
  | "amount-desc"
  | "amount-asc"
  | "merchant-asc"

const PAYMENT_CATEGORIES = ["TRANSFER_OUT", "LOAN_PAYMENTS", "TRANSFER_IN"]

function isZelle(t: Transaction): boolean {
  const name = (t.merchant_name || t.name || "").toLowerCase()
  return name.includes("zelle")
}

/**
 * Base visibility filter:
 * - Show all transactions including deposits, refunds, and transfers
 */
export function applyBaseFilter<T extends Transaction>(transactions: T[]): T[] {
  return transactions
}

/**
 * Search by merchant_name or name fields, case-insensitive.
 * Returns all transactions if term is empty or whitespace.
 */
export function searchTransactions<T extends Transaction>(
  transactions: T[],
  term: string
): T[] {
  const trimmed = term.trim()
  if (!trimmed) return transactions

  const lower = trimmed.toLowerCase()
  return transactions.filter((t) => {
    const merchant = (t.merchant_name || "").toLowerCase()
    const name = (t.name || "").toLowerCase()
    return merchant.includes(lower) || name.includes(lower)
  })
}

/**
 * Compound filter: applies all non-undefined filters in combination.
 * Date comparison uses string comparison (ISO format).
 * Amount range checks absolute values.
 */
export function filterTransactions<T extends Transaction>(
  transactions: T[],
  filters: TransactionFilters
): T[] {
  return transactions.filter((t) => {
    if (filters.dateRange) {
      if (t.date < filters.dateRange.start || t.date > filters.dateRange.end) {
        return false
      }
    }

    if (filters.category !== undefined) {
      if (t.category_primary !== filters.category) return false
    }

    if (filters.amountMin !== undefined) {
      if (Math.abs(t.amount) < filters.amountMin) return false
    }

    if (filters.amountMax !== undefined) {
      if (Math.abs(t.amount) > filters.amountMax) return false
    }

    if (filters.accountId !== undefined) {
      if (t.account_id !== filters.accountId) return false
    }

    return true
  })
}

/**
 * Sort transactions by the given option. Returns a new array (does not mutate).
 * Merchant sort uses merchant_name ?? name ?? "" for comparison.
 */
export function sortTransactions<T extends Transaction>(
  transactions: T[],
  sort: SortOption
): T[] {
  const sorted = [...transactions]

  switch (sort) {
    case "date-desc":
      sorted.sort((a, b) => b.date.localeCompare(a.date))
      break
    case "date-asc":
      sorted.sort((a, b) => a.date.localeCompare(b.date))
      break
    case "amount-desc":
      sorted.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
      break
    case "amount-asc":
      sorted.sort((a, b) => Math.abs(a.amount) - Math.abs(b.amount))
      break
    case "merchant-asc": {
      const getName = (t: Transaction) =>
        (t.merchant_name ?? t.name ?? "").toLowerCase()
      sorted.sort((a, b) => getName(a).localeCompare(getName(b)))
      break
    }
  }

  return sorted
}
