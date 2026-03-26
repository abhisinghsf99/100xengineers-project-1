import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { middleware } from "../middleware"

// Mock NextResponse methods
vi.mock("next/server", async () => {
  const actual = await vi.importActual("next/server")
  return {
    ...actual,
    NextResponse: {
      ...actual.NextResponse,
      next: vi.fn(() => ({ type: "next" })),
      redirect: vi.fn((url: URL) => ({ type: "redirect", url: url.toString() })),
    },
  }
})

function createMockRequest(
  pathname: string,
  cookies: Record<string, string> = {}
): NextRequest {
  const url = new URL(pathname, "http://localhost:3000")
  const request = new NextRequest(url)

  // Set cookies on the request
  for (const [name, value] of Object.entries(cookies)) {
    request.cookies.set(name, value)
  }

  return request
}

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("redirects unauthenticated requests to /login", () => {
    const request = createMockRequest("/")
    const response = middleware(request)

    expect(NextResponse.redirect).toHaveBeenCalled()
    const redirectUrl = (NextResponse.redirect as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as URL
    expect(redirectUrl.pathname).toBe("/login")
  })

  it("allows requests with valid session cookie", () => {
    const request = createMockRequest("/", {
      "fintrack-session": "some-valid-token",
    })
    const response = middleware(request)

    expect(NextResponse.next).toHaveBeenCalled()
    expect(NextResponse.redirect).not.toHaveBeenCalled()
  })

  it("allows /login without cookie (no redirect loop)", () => {
    const request = createMockRequest("/login")
    const response = middleware(request)

    expect(NextResponse.next).toHaveBeenCalled()
    expect(NextResponse.redirect).not.toHaveBeenCalled()
  })

  it("allows /api/auth without cookie", () => {
    const request = createMockRequest("/api/auth")
    const response = middleware(request)

    expect(NextResponse.next).toHaveBeenCalled()
    expect(NextResponse.redirect).not.toHaveBeenCalled()
  })

  it("redirects authenticated user visiting /login to /", () => {
    const request = createMockRequest("/login", {
      "fintrack-session": "some-valid-token",
    })
    const response = middleware(request)

    expect(NextResponse.redirect).toHaveBeenCalled()
    const redirectUrl = (NextResponse.redirect as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as URL
    expect(redirectUrl.pathname).toBe("/")
  })
})
