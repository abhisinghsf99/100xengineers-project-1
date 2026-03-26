import { describe, it, expect } from "vitest"
import type { Transaction } from "@/lib/queries/types"
import { detectRecurring, estimateMonthlyTotal } from "@/lib/recurring-detection"
import type { RecurringCharge } from "@/lib/recurring-detection"

function makeTxn(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "t1",
    plaid_transaction_id: "pt1",
    account_id: "acc1",
    amount: 15.99,
    date: "2026-01-15",
    datetime: null,
    name: "Some Service",
    merchant_name: "Netflix",
    merchant_entity_id: null,
    category_primary: "ENTERTAINMENT",
    category_detailed: null,
    payment_channel: "online",
    is_pending: false,
    pending_transaction_id: null,
    iso_currency_code: "USD",
    logo_url: null,
    website: null,
    created_at: "2026-01-15T00:00:00Z",
    updated_at: "2026-01-15T00:00:00Z",
    ...overrides,
  }
}

describe("detectRecurring", () => {
  it("groups normalized merchant names together", () => {
    const txns = [
      makeTxn({ id: "t1", merchant_name: "NETFLIX.COM", amount: 15.99, date: "2026-01-15" }),
      makeTxn({ id: "t2", merchant_name: "netflix", amount: 15.99, date: "2026-02-15" }),
      makeTxn({ id: "t3", merchant_name: "Netflix.com", amount: 15.99, date: "2026-03-15" }),
    ]
    const result = detectRecurring(txns)
    expect(result).toHaveLength(1)
    expect(result[0].chargeCount).toBe(3)
  })

  it("groups by merchant_entity_id when available", () => {
    const txns = [
      makeTxn({ id: "t1", merchant_entity_id: "ent_netflix", merchant_name: "Netflix", amount: 15.99, date: "2026-01-15" }),
      makeTxn({ id: "t2", merchant_entity_id: "ent_netflix", merchant_name: "NETFLIX INC", amount: 15.99, date: "2026-02-15" }),
      makeTxn({ id: "t3", merchant_entity_id: "ent_netflix", merchant_name: "Netflix.com", amount: 15.99, date: "2026-03-15" }),
    ]
    const result = detectRecurring(txns)
    expect(result).toHaveLength(1)
    expect(result[0].chargeCount).toBe(3)
  })

  it("excludes groups with fewer than 3 occurrences", () => {
    const txns = [
      makeTxn({ id: "t1", merchant_name: "Netflix", amount: 15.99, date: "2026-01-15" }),
      makeTxn({ id: "t2", merchant_name: "Netflix", amount: 15.99, date: "2026-02-15" }),
    ]
    const result = detectRecurring(txns)
    expect(result).toHaveLength(0)
  })

  it("includes groups with 3+ occurrences", () => {
    const txns = [
      makeTxn({ id: "t1", merchant_name: "Netflix", amount: 15.99, date: "2026-01-15" }),
      makeTxn({ id: "t2", merchant_name: "Netflix", amount: 15.99, date: "2026-02-15" }),
      makeTxn({ id: "t3", merchant_name: "Netflix", amount: 15.99, date: "2026-03-15" }),
    ]
    const result = detectRecurring(txns)
    expect(result).toHaveLength(1)
  })

  it("infers monthly frequency for ~30-day intervals", () => {
    const txns = [
      makeTxn({ id: "t1", merchant_name: "Netflix", amount: 15.99, date: "2026-01-15" }),
      makeTxn({ id: "t2", merchant_name: "Netflix", amount: 15.99, date: "2026-02-14" }),
      makeTxn({ id: "t3", merchant_name: "Netflix", amount: 15.99, date: "2026-03-16" }),
    ]
    const result = detectRecurring(txns)
    expect(result[0].frequency).toBe("monthly")
  })

  it("infers weekly frequency for ~7-day intervals", () => {
    const txns = [
      makeTxn({ id: "t1", merchant_name: "Gym", amount: 10.0, date: "2026-01-07" }),
      makeTxn({ id: "t2", merchant_name: "Gym", amount: 10.0, date: "2026-01-14" }),
      makeTxn({ id: "t3", merchant_name: "Gym", amount: 10.0, date: "2026-01-21" }),
    ]
    const result = detectRecurring(txns)
    expect(result[0].frequency).toBe("weekly")
  })

  it("sorts results by amount descending", () => {
    const txns = [
      // Cheap recurring
      makeTxn({ id: "t1", merchant_name: "Spotify", amount: 9.99, date: "2026-01-01" }),
      makeTxn({ id: "t2", merchant_name: "Spotify", amount: 9.99, date: "2026-02-01" }),
      makeTxn({ id: "t3", merchant_name: "Spotify", amount: 9.99, date: "2026-03-01" }),
      // Expensive recurring
      makeTxn({ id: "t4", merchant_name: "Netflix", amount: 22.99, date: "2026-01-15" }),
      makeTxn({ id: "t5", merchant_name: "Netflix", amount: 22.99, date: "2026-02-15" }),
      makeTxn({ id: "t6", merchant_name: "Netflix", amount: 22.99, date: "2026-03-15" }),
    ]
    const result = detectRecurring(txns)
    expect(result).toHaveLength(2)
    expect(result[0].amount).toBeGreaterThan(result[1].amount)
  })

  it("excludes negative amounts (income) from detection", () => {
    const txns = [
      makeTxn({ id: "t1", merchant_name: "Employer", amount: -3000, date: "2026-01-01" }),
      makeTxn({ id: "t2", merchant_name: "Employer", amount: -3000, date: "2026-02-01" }),
      makeTxn({ id: "t3", merchant_name: "Employer", amount: -3000, date: "2026-03-01" }),
    ]
    const result = detectRecurring(txns)
    expect(result).toHaveLength(0)
  })

  it("returns correct lastChargeDate", () => {
    const txns = [
      makeTxn({ id: "t1", merchant_name: "Netflix", amount: 15.99, date: "2026-01-15" }),
      makeTxn({ id: "t2", merchant_name: "Netflix", amount: 15.99, date: "2026-03-15" }),
      makeTxn({ id: "t3", merchant_name: "Netflix", amount: 15.99, date: "2026-02-15" }),
    ]
    const result = detectRecurring(txns)
    expect(result[0].lastChargeDate).toBe("2026-03-15")
  })

  it("separates same merchant with different amounts", () => {
    const txns = [
      makeTxn({ id: "t1", merchant_name: "Netflix", amount: 15.99, date: "2026-01-15" }),
      makeTxn({ id: "t2", merchant_name: "Netflix", amount: 15.99, date: "2026-02-15" }),
      makeTxn({ id: "t3", merchant_name: "Netflix", amount: 15.99, date: "2026-03-15" }),
      makeTxn({ id: "t4", merchant_name: "Netflix", amount: 22.99, date: "2026-01-15" }),
      makeTxn({ id: "t5", merchant_name: "Netflix", amount: 22.99, date: "2026-02-15" }),
      makeTxn({ id: "t6", merchant_name: "Netflix", amount: 22.99, date: "2026-03-15" }),
    ]
    const result = detectRecurring(txns)
    expect(result).toHaveLength(2)
  })
})

describe("estimateMonthlyTotal", () => {
  it("calculates mixed frequencies correctly", () => {
    const charges: RecurringCharge[] = [
      {
        merchantName: "Netflix",
        amount: 15.99,
        frequency: "monthly",
        lastChargeDate: "2026-03-15",
        chargeCount: 3,
        transactions: [],
      },
      {
        merchantName: "Gym",
        amount: 10.0,
        frequency: "weekly",
        lastChargeDate: "2026-03-21",
        chargeCount: 4,
        transactions: [],
      },
      {
        merchantName: "Insurance",
        amount: 1200.0,
        frequency: "yearly",
        lastChargeDate: "2026-01-01",
        chargeCount: 3,
        transactions: [],
      },
    ]
    const total = estimateMonthlyTotal(charges)
    // monthly: 15.99 * 1 = 15.99
    // weekly: 10 * 4.33 = 43.30
    // yearly: 1200 / 12 = 100
    const expected = 15.99 + 10.0 * 4.33 + 1200 / 12
    expect(total).toBeCloseTo(expected, 1)
  })

  it("handles biweekly frequency", () => {
    const charges: RecurringCharge[] = [
      {
        merchantName: "Cleaning",
        amount: 80.0,
        frequency: "biweekly",
        lastChargeDate: "2026-03-10",
        chargeCount: 6,
        transactions: [],
      },
    ]
    const total = estimateMonthlyTotal(charges)
    expect(total).toBeCloseTo(80.0 * 2.17, 1)
  })

  it("returns 0 for empty array", () => {
    expect(estimateMonthlyTotal([])).toBe(0)
  })
})
