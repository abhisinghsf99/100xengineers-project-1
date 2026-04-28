import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { TopNav } from "@/components/layout/top-nav"

describe("TopNav", () => {
  it("renders Finance Tracker branding text", () => {
    render(<TopNav />)
    expect(screen.getByText("Finance Tracker")).toBeDefined()
  })
})
