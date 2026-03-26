import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { TopNav } from "@/components/layout/top-nav"

// Mock next/navigation
const mockPush = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Mock fetch
const mockFetch = vi.fn(() =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) })
)

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = mockFetch as unknown as typeof fetch
})

describe("TopNav", () => {
  it("renders FinTrack branding text", () => {
    render(<TopNav />)
    expect(screen.getByText("FinTrack")).toBeDefined()
  })

  it("renders a Sign Out button", () => {
    render(<TopNav />)
    expect(screen.getByRole("button", { name: /sign out/i })).toBeDefined()
  })

  it("calls fetch with DELETE method to /api/auth on sign out click", async () => {
    render(<TopNav />)
    const signOutBtn = screen.getByRole("button", { name: /sign out/i })
    fireEvent.click(signOutBtn)

    expect(mockFetch).toHaveBeenCalledWith("/api/auth", { method: "DELETE" })
  })
})
