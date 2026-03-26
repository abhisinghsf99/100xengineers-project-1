import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"
import { TransactionsPanel } from "@/components/dashboard/transactions-panel"
import type { TransactionWithAccount } from "@/lib/queries/transactions"

// Mock chart-colors
vi.mock("@/lib/chart-colors", () => ({
  getCategoryColor: () => "hsl(174, 55%, 50%)",
}))

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysAgoDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function makeTxn(
  overrides: Partial<TransactionWithAccount> & { id: string }
): TransactionWithAccount {
  return {
    plaid_transaction_id: `plaid-${overrides.id}`,
    account_id: "acc-1",
    amount: 25.0,
    date: today(),
    datetime: null,
    name: "Test Store",
    merchant_name: "Test Merchant",
    merchant_entity_id: null,
    category_primary: "FOOD_AND_DRINK",
    category_detailed: null,
    payment_channel: "in_store",
    is_pending: false,
    pending_transaction_id: null,
    iso_currency_code: "USD",
    logo_url: null,
    website: null,
    created_at: "2026-03-11T00:00:00Z",
    updated_at: "2026-03-11T00:00:00Z",
    account_name: "Chase Checking",
    ...overrides,
  }
}

const mockAccounts = [{ id: "acc-1", name: "Chase Checking" }]

function makeTransactions(count: number): TransactionWithAccount[] {
  return Array.from({ length: count }, (_, i) =>
    makeTxn({
      id: `txn-${i + 1}`,
      merchant_name: `Merchant ${i + 1}`,
      amount: 10 + i * 5,
      date: daysAgoDate(i), // txn-1 = today, txn-2 = yesterday, etc.
    })
  )
}

describe("TransactionsPanel", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders collapsed by default with transaction count in header", () => {
    const txns = makeTransactions(5)
    render(<TransactionsPanel transactions={txns} accounts={mockAccounts} />)

    // Header should show count - after base filter (all positive amounts pass)
    expect(screen.getByText(/Transactions \(5\)/)).toBeDefined()
  })

  it("shows only 3 transactions when collapsed", () => {
    const txns = makeTransactions(5)
    render(<TransactionsPanel transactions={txns} accounts={mockAccounts} />)

    // Should see first 3 merchants
    expect(screen.getByText("Merchant 1")).toBeDefined()
    expect(screen.getByText("Merchant 2")).toBeDefined()
    expect(screen.getByText("Merchant 3")).toBeDefined()

    // Should NOT see merchants 4 and 5
    expect(screen.queryByText("Merchant 4")).toBeNull()
    expect(screen.queryByText("Merchant 5")).toBeNull()
  })

  it("shows 'last 3 days' spending total when collapsed", () => {
    // Create 5 txns: today ($10), yesterday ($15), 2 days ago ($20), 3 days ago ($25), 4 days ago ($30)
    const txns = makeTransactions(5)
    render(<TransactionsPanel transactions={txns} accounts={mockAccounts} />)

    // Last 3 days includes today, 1 day ago, 2 days ago, and the cutoff day
    // daysAgo(3) = Mar 8, so dates >= Mar 8: $10 + $15 + $20 + $25 = $70
    // Text is split across elements, so use a function matcher
    expect(screen.getByText(/in the last 3 days/)).toBeDefined()
  })

  it("expands on header click showing toolbar and 14-day list", () => {
    const txns = makeTransactions(5)
    render(<TransactionsPanel transactions={txns} accounts={mockAccounts} />)

    // Click header to expand
    const header = screen.getByText(/Transactions \(5\)/)
    fireEvent.click(header)

    // Search input should appear
    expect(screen.getByPlaceholderText("Search transactions...")).toBeDefined()

    // All 5 merchants should be visible now (all within 14 days)
    expect(screen.getByText("Merchant 4")).toBeDefined()
    expect(screen.getByText("Merchant 5")).toBeDefined()

    // 14-day spending footer
    expect(screen.getByText(/\$100\.00 in the last 14 days/)).toBeDefined()
  })

  it("shows loading skeletons when transactions array is empty", () => {
    const { container } = render(
      <TransactionsPanel transactions={[]} accounts={mockAccounts} />
    )

    // Should have skeleton elements
    const skeletons = container.querySelectorAll("[data-slot='skeleton']")
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it("shows header with filtered count when search is active", async () => {
    const txns = makeTransactions(5)
    render(<TransactionsPanel transactions={txns} accounts={mockAccounts} />)

    // Expand
    fireEvent.click(screen.getByText(/Transactions \(5\)/))

    // Type in search
    const searchInput = screen.getByPlaceholderText("Search transactions...")
    fireEvent.change(searchInput, { target: { value: "Merchant 1" } })

    // Advance debounce timer
    act(() => {
      vi.advanceTimersByTime(350)
    })

    // Header should now show filtered count
    expect(screen.getByText(/Showing 1 of 5 transactions/)).toBeDefined()
  })

  it("shows 'Load more' button when hasMore is true", () => {
    const txns = makeTransactions(3)
    const onLoadMore = vi.fn()
    render(
      <TransactionsPanel
        transactions={txns}
        accounts={mockAccounts}
        onLoadMore={onLoadMore}
        hasMore={true}
      />
    )

    // Expand first
    fireEvent.click(screen.getByText(/Transactions/))

    const loadMoreBtn = screen.getByText("Load more")
    expect(loadMoreBtn).toBeDefined()

    fireEvent.click(loadMoreBtn)
    expect(onLoadMore).toHaveBeenCalledOnce()
  })

  it("does not show 'Load more' button when hasMore is false", () => {
    const txns = makeTransactions(3)
    render(
      <TransactionsPanel
        transactions={txns}
        accounts={mockAccounts}
        hasMore={false}
      />
    )

    // Expand
    fireEvent.click(screen.getByText(/Transactions/))

    expect(screen.queryByText("Load more")).toBeNull()
  })
})
