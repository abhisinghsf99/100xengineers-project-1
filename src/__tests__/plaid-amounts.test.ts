import { describe, it, expect } from "vitest"
import {
  isSpending,
  isIncome,
  displayAmount,
  formatCurrency,
  totalSpending,
  totalIncome,
} from "@/lib/plaid-amounts"

describe("plaid-amounts", () => {
  describe("isSpending", () => {
    it("returns true for positive amounts (money leaving account)", () => {
      expect(isSpending(50)).toBe(true)
    })

    it("returns false for negative amounts (income)", () => {
      expect(isSpending(-20)).toBe(false)
    })

    it("returns false for zero", () => {
      expect(isSpending(0)).toBe(false)
    })
  })

  describe("isIncome", () => {
    it("returns true for negative amounts (money entering account)", () => {
      expect(isIncome(-30)).toBe(true)
    })

    it("returns false for positive amounts (spending)", () => {
      expect(isIncome(10)).toBe(false)
    })

    it("returns false for zero", () => {
      expect(isIncome(0)).toBe(false)
    })
  })

  describe("displayAmount", () => {
    it("returns absolute value for negative amounts", () => {
      expect(displayAmount(-45.5)).toBe(45.5)
    })

    it("returns same value for positive amounts", () => {
      expect(displayAmount(45.5)).toBe(45.5)
    })

    it("returns 0 for zero", () => {
      expect(displayAmount(0)).toBe(0)
    })
  })

  describe("formatCurrency", () => {
    it("formats positive amount as USD currency", () => {
      expect(formatCurrency(1234.5)).toBe("$1,234.50")
    })

    it("formats negative amount as positive USD currency", () => {
      expect(formatCurrency(-1234.5)).toBe("$1,234.50")
    })

    it("formats zero as $0.00", () => {
      expect(formatCurrency(0)).toBe("$0.00")
    })

    it("handles small amounts with proper decimal places", () => {
      expect(formatCurrency(0.5)).toBe("$0.50")
    })
  })

  describe("totalSpending", () => {
    it("sums only positive amounts", () => {
      expect(totalSpending([50, -20, 30, -10])).toBe(80)
    })

    it("returns 0 for empty array", () => {
      expect(totalSpending([])).toBe(0)
    })

    it("returns 0 when all amounts are negative", () => {
      expect(totalSpending([-10, -20, -30])).toBe(0)
    })
  })

  describe("totalIncome", () => {
    it("sums absolute values of negative amounts", () => {
      expect(totalIncome([50, -20, 30, -10])).toBe(30)
    })

    it("returns 0 for empty array", () => {
      expect(totalIncome([])).toBe(0)
    })

    it("returns 0 when all amounts are positive", () => {
      expect(totalIncome([10, 20, 30])).toBe(0)
    })
  })
})
