import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { MobileNav } from "@/components/layout/mobile-nav"

describe("MobileNav", () => {
  it("renders 4 navigation items with anchor hrefs", () => {
    render(<MobileNav />)
    const links = screen.getAllByRole("link")
    expect(links).toHaveLength(4)
  })

  it("has anchor links for #summary, #accounts, #transactions, #chat", () => {
    render(<MobileNav />)
    const expectedHrefs = ["#summary", "#accounts", "#transactions", "#chat"]

    for (const href of expectedHrefs) {
      const link = screen.getByRole("link", {
        name: new RegExp(href.replace("#", ""), "i"),
      })
      expect(link.getAttribute("href")).toBe(href)
    }
  })

  it("does NOT render any links with href starting with /", () => {
    render(<MobileNav />)
    const links = screen.getAllByRole("link")

    for (const link of links) {
      const href = link.getAttribute("href") || ""
      expect(href.startsWith("/")).toBe(false)
    }
  })
})
