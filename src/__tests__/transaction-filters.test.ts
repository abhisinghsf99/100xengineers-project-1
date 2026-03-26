import { describe, it, expect } from "vitest"
import type { Transaction } from "@/lib/queries/types"
import {
  applyBaseFilter,
  searchTransactions,
  filterTransactions,
  sortTransactions,
} from "@/lib/transaction-filters"
import type { TransactionFilters, SortOption } from "@/lib/transaction-filters"

function makeTxn(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "t1",
    plaid_transaction_id: "pt1",
    account_id: "acc1",
    amount: 25.0,
    date: "2026-03-01",
    datetime: null,
    name: "Some Transaction",
    merchant_name: "Coffee Shop",
    merchant_entity_id: null,
    category_primary: "FOOD_AND_DRINK",
    category_detailed: null,
    payment_channel: "in store",
    is_pending: false,
    pending_transaction_id: null,
    iso_currency_code: "USD",
    logo_url: null,
    website: null,
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
    ...overrides,
  }
}

describe("applyBaseFilter", () => {
  it("keeps normal spending transactions", () => {
    const txns = [makeTxn({ amount: 25.0, category_primary: "FOOD_AND_DRINK" })]
    const result = applyBaseFilter(txns)
    expect(result).toHaveLength(1)
  })

  it("removes deposits (negative amounts)", () => {
    const txns = [makeTxn({ amount: -500.0, category_primary: "INCOME" })]
    const result = applyBaseFilter(txns)
    expect(result).toHaveLength(0)
  })

  it("removes LOAN_PAYMENTS category", () => {
    const txns = [makeTxn({ amount: 100.0, category_primary: "LOAN_PAYMENTS" })]
    const result = applyBaseFilter(txns)
    expect(result).toHaveLength(0)
  })

  it("removes TRANSFER_OUT category", () => {
    const txns = [makeTxn({ amount: 50.0, category_primary: "TRANSFER_OUT" })]
    const result = applyBaseFilter(txns)
    expect(result).toHaveLength(0)
  })

  it("removes TRANSFER_IN category", () => {
    const txns = [makeTxn({ amount: 50.0, category_primary: "TRANSFER_IN" })]
    const result = applyBaseFilter(txns)
    expect(result).toHaveLength(0)
  })

  it("keeps Zelle transfer (via merchant_name)", () => {
    const txns = [
      makeTxn({
        amount: 30.0,
        category_primary: "TRANSFER_OUT",
        merchant_name: "Zelle Payment",
      }),
    ]
    const result = applyBaseFilter(txns)
    expect(result).toHaveLength(1)
  })

  it("keeps Zelle transfer (via name field when merchant_name is null)", () => {
    const txns = [
      makeTxn({
        amount: 30.0,
        category_primary: "TRANSFER_OUT",
        merchant_name: null,
        name: "ZELLE TO JOHN",
      }),
    ]
    const result = applyBaseFilter(txns)
    expect(result).toHaveLength(1)
  })
})

describe("searchTransactions", () => {
  const txns = [
    makeTxn({ merchant_name: "Starbucks", name: "Starbucks Coffee" }),
    makeTxn({ merchant_name: "Netflix", name: "Netflix Subscription" }),
    makeTxn({ merchant_name: null, name: "Amazon Prime" }),
  ]

  it("returns all when term is empty", () => {
    expect(searchTransactions(txns, "")).toHaveLength(3)
  })

  it("returns all when term is whitespace", () => {
    expect(searchTransactions(txns, "   ")).toHaveLength(3)
  })

  it("matches partial merchant_name", () => {
    expect(searchTransactions(txns, "star")).toHaveLength(1)
  })

  it("is case insensitive", () => {
    expect(searchTransactions(txns, "NETFLIX")).toHaveLength(1)
  })

  it("matches on name field when merchant_name is null", () => {
    expect(searchTransactions(txns, "amazon")).toHaveLength(1)
  })

  it("returns empty for no match", () => {
    expect(searchTransactions(txns, "walmart")).toHaveLength(0)
  })
})

describe("filterTransactions", () => {
  const txns = [
    makeTxn({ id: "t1", date: "2026-03-01", category_primary: "FOOD_AND_DRINK", amount: 10, account_id: "acc1" }),
    makeTxn({ id: "t2", date: "2026-03-05", category_primary: "TRANSPORTATION", amount: 50, account_id: "acc2" }),
    makeTxn({ id: "t3", date: "2026-03-10", category_primary: "FOOD_AND_DRINK", amount: 100, account_id: "acc1" }),
  ]

  it("returns all when no filters applied", () => {
    expect(filterTransactions(txns, {})).toHaveLength(3)
  })

  it("filters by date range", () => {
    const filters: TransactionFilters = { dateRange: { start: "2026-03-03", end: "2026-03-08" } }
    const result = filterTransactions(txns, filters)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("t2")
  })

  it("filters by category", () => {
    const filters: TransactionFilters = { category: "FOOD_AND_DRINK" }
    const result = filterTransactions(txns, filters)
    expect(result).toHaveLength(2)
  })

  it("filters by amount range", () => {
    const filters: TransactionFilters = { amountMin: 20, amountMax: 60 }
    const result = filterTransactions(txns, filters)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("t2")
  })

  it("filters by account", () => {
    const filters: TransactionFilters = { accountId: "acc2" }
    const result = filterTransactions(txns, filters)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("t2")
  })

  it("combines multiple filters", () => {
    const filters: TransactionFilters = {
      category: "FOOD_AND_DRINK",
      amountMin: 50,
    }
    const result = filterTransactions(txns, filters)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("t3")
  })
})

describe("sortTransactions", () => {
  const txns = [
    makeTxn({ id: "t1", date: "2026-03-05", amount: 50, merchant_name: "Bravo" }),
    makeTxn({ id: "t2", date: "2026-03-01", amount: 10, merchant_name: "Alpha" }),
    makeTxn({ id: "t3", date: "2026-03-10", amount: 100, merchant_name: "Charlie" }),
  ]

  it("sorts by date descending", () => {
    const result = sortTransactions(txns, "date-desc")
    expect(result.map((t) => t.id)).toEqual(["t3", "t1", "t2"])
  })

  it("sorts by date ascending", () => {
    const result = sortTransactions(txns, "date-asc")
    expect(result.map((t) => t.id)).toEqual(["t2", "t1", "t3"])
  })

  it("sorts by amount descending", () => {
    const result = sortTransactions(txns, "amount-desc")
    expect(result.map((t) => t.id)).toEqual(["t3", "t1", "t2"])
  })

  it("sorts by amount ascending", () => {
    const result = sortTransactions(txns, "amount-asc")
    expect(result.map((t) => t.id)).toEqual(["t2", "t1", "t3"])
  })

  it("sorts by merchant ascending", () => {
    const result = sortTransactions(txns, "merchant-asc")
    expect(result.map((t) => t.id)).toEqual(["t2", "t1", "t3"])
  })

  it("does not mutate original array", () => {
    const original = [...txns]
    sortTransactions(txns, "date-asc")
    expect(txns.map((t) => t.id)).toEqual(original.map((t) => t.id))
  })

  it("sorts by merchant using name when merchant_name is null", () => {
    const withNull = [
      makeTxn({ id: "t1", merchant_name: null, name: "Zebra" }),
      makeTxn({ id: "t2", merchant_name: null, name: "Apple" }),
    ]
    const result = sortTransactions(withNull, "merchant-asc")
    expect(result.map((t) => t.id)).toEqual(["t2", "t1"])
  })
})
