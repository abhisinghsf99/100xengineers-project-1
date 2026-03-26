/**
 * Category color palette for Plaid category_primary values.
 * Muted HSL colors optimized for dark backgrounds and chart readability.
 */

export const CATEGORY_COLORS: Record<string, string> = {
  FOOD_AND_DRINK: "hsl(174, 55%, 50%)",
  TRANSPORTATION: "hsl(210, 50%, 55%)",
  ENTERTAINMENT: "hsl(280, 45%, 55%)",
  SHOPPING: "hsl(340, 50%, 55%)",
  GENERAL_MERCHANDISE: "hsl(25, 55%, 55%)",
  RENT_AND_UTILITIES: "hsl(195, 50%, 50%)",
  PERSONAL_CARE: "hsl(310, 40%, 55%)",
  TRAVEL: "hsl(150, 45%, 50%)",
  GENERAL_SERVICES: "hsl(230, 40%, 55%)",
  LOAN_PAYMENTS: "hsl(0, 45%, 55%)",
  TRANSFER_OUT: "hsl(45, 50%, 50%)",
  MEDICAL: "hsl(120, 35%, 50%)",
  OTHER: "hsl(220, 15%, 55%)",
  INCOME: "hsl(160, 55%, 45%)",
  TRANSFER_IN: "hsl(60, 40%, 50%)",
  BANK_FEES: "hsl(350, 35%, 50%)",
  HOME_IMPROVEMENT: "hsl(85, 40%, 50%)",
} as const

/**
 * Returns the HSL color for a given category.
 * Falls back to OTHER color for unknown categories.
 */
export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.OTHER
}
