import { createServerSupabase } from "@/lib/supabase/server"
import type { Transaction } from "./types"

export type TransactionWithAccount = Transaction & {
  account_name: string
}

interface MonthlySpendingEntry {
  month: string
  total: number
  count: number
}

interface CategorySpendingEntry {
  category: string
  total: number
  count: number
}

export async function getTransactions(
  options?: { limit?: number; offset?: number }
): Promise<Transaction[]> {
  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0

  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("date", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error)
    throw new Error(`Failed to fetch transactions: ${error.message}`)
  return data as Transaction[]
}

export async function getMonthlySpending(
  yearMonth: string
): Promise<{ total: number; count: number }> {
  const supabase = createServerSupabase()
  const startDate = `${yearMonth}-01`
  const [year, month] = yearMonth.split("-").map(Number)
  const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`
  const { data, error } = await supabase
    .from("transactions")
    .select("amount")
    .gte("date", startDate)
    .lt("date", nextMonth)

  if (error)
    throw new Error(`Failed to fetch monthly spending: ${error.message}`)

  const spending = (data as { amount: number }[])
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0)

  return {
    total: spending,
    count: (data as { amount: number }[]).filter((t) => t.amount > 0).length,
  }
}

/**
 * Fetches spending totals for the trailing N months (oldest first).
 * Uses parallel fetching via Promise.all for performance.
 */
export async function getTrailingMonthlySpending(
  months = 6
): Promise<MonthlySpendingEntry[]> {
  const now = new Date()
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ]

  const promises = Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1)
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = monthNames[d.getMonth()]
    return getMonthlySpending(yearMonth).then((result) => ({
      month: label,
      total: result.total,
      count: result.count,
    }))
  })

  return Promise.all(promises)
}

/**
 * Groups spending transactions for a given month by category_primary.
 * Returns sorted by total descending. Null categories become "OTHER".
 */
export async function getCategorySpending(
  yearMonth: string
): Promise<CategorySpendingEntry[]> {
  const supabase = createServerSupabase()
  const startDate = `${yearMonth}-01`
  const [year, month] = yearMonth.split("-").map(Number)
  const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`
  const { data, error } = await supabase
    .from("transactions")
    .select("amount, category_primary")
    .gte("date", startDate)
    .lt("date", nextMonth)

  if (error)
    throw new Error(`Failed to fetch category spending: ${error.message}`)

  const rows = data as { amount: number; category_primary: string | null }[]
  const spending = rows.filter((t) => t.amount > 0)

  const map = new Map<string, { total: number; count: number }>()
  for (const t of spending) {
    const cat = t.category_primary ?? "OTHER"
    const entry = map.get(cat) ?? { total: 0, count: 0 }
    entry.total += t.amount
    entry.count += 1
    map.set(cat, entry)
  }

  return Array.from(map.entries())
    .map(([category, { total, count }]) => ({ category, total, count }))
    .sort((a, b) => b.total - a.total)
}

/**
 * Fetches spending transactions for a specific month and category.
 * Ordered by date descending.
 */
export async function getTransactionsByCategory(
  yearMonth: string,
  category: string
): Promise<Transaction[]> {
  const supabase = createServerSupabase()

  const startDate = `${yearMonth}-01`
  const [yr, mo] = yearMonth.split("-").map(Number)
  const nextMonth = mo === 12 ? `${yr + 1}-01-01` : `${yr}-${String(mo + 1).padStart(2, "0")}-01`
  let query = supabase
    .from("transactions")
    .select("*")
    .gte("date", startDate)
    .lt("date", nextMonth)
    .gt("amount", 0)
    .order("date", { ascending: false })

  if (category === "OTHER") {
    query = query.is("category_primary", null)
  } else {
    query = query.eq("category_primary", category)
  }

  const { data, error } = await query

  if (error)
    throw new Error(
      `Failed to fetch transactions by category: ${error.message}`
    )
  return data as Transaction[]
}

/**
 * Fetches transactions with joined account name.
 * Uses Supabase relation join to get account.name in a single query.
 */
export async function getTransactionsWithAccounts(
  options?: { limit?: number; offset?: number }
): Promise<TransactionWithAccount[]> {
  const limit = options?.limit ?? 500
  const offset = options?.offset ?? 0

  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from("transactions")
    .select("*, accounts(name)")
    .order("date", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error)
    throw new Error(
      `Failed to fetch transactions with accounts: ${error.message}`
    )

  // Flatten the joined account name into a top-level field
  return (data as (Transaction & { accounts: { name: string | null } | null })[]).map(
    (row) => {
      const { accounts: accountData, ...txn } = row
      return {
        ...txn,
        account_name: accountData?.name ?? "Unknown Account",
      } as TransactionWithAccount
    }
  )
}
