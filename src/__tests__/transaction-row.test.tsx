import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { TransactionRow } from "@/components/dashboard/transaction-row"
import type { TransactionWithAccount } from "@/lib/queries/transactions"

// Mock chart-colors to control the color output
vi.mock("@/lib/chart-colors", () => ({
  getCategoryColor: (category: string) => {
    if (category === "FOOD_AND_DRINK") return "hsl(174, 55%, 50%)"
    return "hsl(220, 15%, 55%)"
  },
}))

function makeTxn(overrides: Partial<TransactionWithAccount> = {}): TransactionWithAccount {
  return {
    id: "txn-1",
    plaid_transaction_id: "plaid-1",
    account_id: "acc-1",
    amount: 42.5,
    date: "2026-03-11",
    datetime: null,
    name: "STARBUCKS #1234",
    merchant_name: "Starbucks",
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

describe("TransactionRow", () => {
  it("renders merchant name, formatted amount, category badge, date, and account name", () => {
    const txn = makeTxn()
    render(<TransactionRow transaction={txn} />)

    // Merchant name
    expect(screen.getByText("Starbucks")).toBeDefined()

    // Formatted amount
    expect(screen.getByText("$42.50")).toBeDefined()

    // Category badge (title case from FOOD_AND_DRINK)
    expect(screen.getByText("Food And Drink")).toBeDefined()

    // Date formatted as "Mar 11, 2026"
    expect(screen.getByText("Mar 11, 2026")).toBeDefined()

    // Account name
    expect(screen.getByText("Chase Checking")).toBeDefined()
  })

  it("falls back to name field when merchant_name is null", () => {
    const txn = makeTxn({ merchant_name: null })
    render(<TransactionRow transaction={txn} />)

    expect(screen.getByText("STARBUCKS #1234")).toBeDefined()
  })

  it("falls back to 'Unknown' when both merchant_name and name are null", () => {
    const txn = makeTxn({ merchant_name: null, name: null })
    render(<TransactionRow transaction={txn} />)

    expect(screen.getByText("Unknown")).toBeDefined()
  })

  it("displays category badge with correct background color from getCategoryColor", () => {
    const txn = makeTxn({ category_primary: "FOOD_AND_DRINK" })
    render(<TransactionRow transaction={txn} />)

    const badge = screen.getByTestId("category-badge")
    // jsdom converts HSL to RGB
    expect(badge.style.backgroundColor).toBeTruthy()
  })

  it("displays Other category when category_primary is null", () => {
    const txn = makeTxn({ category_primary: null })
    render(<TransactionRow transaction={txn} />)

    expect(screen.getByText("Other")).toBeDefined()
    const badge = screen.getByTestId("category-badge")
    expect(badge.style.backgroundColor).toBeTruthy()
  })
})
