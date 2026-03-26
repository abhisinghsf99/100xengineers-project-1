import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { RecurringPanel } from "@/components/dashboard/recurring-panel"
import type { Transaction } from "@/lib/queries/types"

// Mock recurring-detection to control output
vi.mock("@/lib/recurring-detection", () => ({
  detectRecurring: vi.fn(),
  estimateMonthlyTotal: vi.fn(),
}))

import {
  detectRecurring,
  estimateMonthlyTotal,
} from "@/lib/recurring-detection"
import type { RecurringCharge } from "@/lib/recurring-detection"

const mockDetect = vi.mocked(detectRecurring)
const mockEstimate = vi.mocked(estimateMonthlyTotal)

function makeTxn(id: string): Transaction {
  return {
    id,
    plaid_transaction_id: `plaid-${id}`,
    account_id: "acc-1",
    amount: 15.99,
    date: "2026-03-01",
    datetime: null,
    name: "Test",
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
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  }
}

function makeCharges(count: number): RecurringCharge[] {
  const names = ["Netflix", "Spotify", "Hulu", "Disney+", "Apple Music"]
  return Array.from({ length: count }, (_, i) => ({
    merchantName: names[i] || `Service ${i + 1}`,
    amount: 15.99 - i * 2,
    frequency: "monthly" as const,
    lastChargeDate: "2026-03-01",
    chargeCount: 4,
    transactions: [makeTxn(`txn-${i}`)],
  }))
}

describe("RecurringPanel", () => {
  it("renders collapsed by default with count in header", () => {
    const charges = makeCharges(4)
    mockDetect.mockReturnValue(charges)
    mockEstimate.mockReturnValue(45.96)

    render(<RecurringPanel transactions={[makeTxn("1")]} />)

    expect(screen.getByText("Recurring Charges (4)")).toBeDefined()
  })

  it("shows top 3 recurring charges when collapsed", () => {
    const charges = makeCharges(5)
    mockDetect.mockReturnValue(charges)
    mockEstimate.mockReturnValue(50.0)

    render(<RecurringPanel transactions={[makeTxn("1")]} />)

    // First 3 visible
    expect(screen.getByText("Netflix")).toBeDefined()
    expect(screen.getByText("Spotify")).toBeDefined()
    expect(screen.getByText("Hulu")).toBeDefined()

    // 4th and 5th not visible
    expect(screen.queryByText("Disney+")).toBeNull()
    expect(screen.queryByText("Apple Music")).toBeNull()
  })

  it("displays monthly total in footer", () => {
    mockDetect.mockReturnValue(makeCharges(3))
    mockEstimate.mockReturnValue(45.96)

    render(<RecurringPanel transactions={[makeTxn("1")]} />)

    expect(screen.getByText(/~\$45\.96\/mo estimated/)).toBeDefined()
  })

  it("shows empty state when no recurring detected", () => {
    mockDetect.mockReturnValue([])
    mockEstimate.mockReturnValue(0)

    render(<RecurringPanel transactions={[makeTxn("1")]} />)

    expect(screen.getByText("No recurring charges detected")).toBeDefined()
  })

  it("shows all charges when expanded", () => {
    const charges = makeCharges(5)
    mockDetect.mockReturnValue(charges)
    mockEstimate.mockReturnValue(50.0)

    render(<RecurringPanel transactions={[makeTxn("1")]} />)

    // Click header to expand
    fireEvent.click(screen.getByText("Recurring Charges (5)"))

    // All 5 should be visible
    expect(screen.getByText("Netflix")).toBeDefined()
    expect(screen.getByText("Spotify")).toBeDefined()
    expect(screen.getByText("Hulu")).toBeDefined()
    expect(screen.getByText("Disney+")).toBeDefined()
    expect(screen.getByText("Apple Music")).toBeDefined()
  })

  it("shows frequency badges on each row", () => {
    mockDetect.mockReturnValue(makeCharges(2))
    mockEstimate.mockReturnValue(30.0)

    render(<RecurringPanel transactions={[makeTxn("1")]} />)

    // Both rows should have "Monthly" badge
    const badges = screen.getAllByText("Monthly")
    expect(badges.length).toBe(2)
  })
})
