import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Set env var before importing the route
vi.stubEnv("APP_PASSWORD", "test-password-123")

describe("auth API route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function importPOST() {
    const mod = await import("../app/api/auth/route")
    return mod.POST
  }

  function createAuthRequest(body?: unknown): NextRequest {
    const init: RequestInit = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }
    if (body !== undefined) {
      init.body = JSON.stringify(body)
    }
    return new NextRequest(new URL("/api/auth", "http://localhost:3000"), init)
  }

  it("returns 200 and sets cookie for correct password", async () => {
    const POST = await importPOST()
    const request = createAuthRequest({ password: "test-password-123" })
    const response = await POST(request)

    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.success).toBe(true)

    // Check cookie was set
    const setCookie = response.headers.get("set-cookie")
    expect(setCookie).toBeTruthy()
    expect(setCookie).toContain("fintrack-session")
    expect(setCookie).toContain("HttpOnly")
    expect(setCookie).toContain("Path=/")
  })

  it("returns 401 for wrong password", async () => {
    const POST = await importPOST()
    const request = createAuthRequest({ password: "wrong-password" })
    const response = await POST(request)

    expect(response.status).toBe(401)

    const body = await response.json()
    expect(body.error).toBe("Incorrect password")
  })

  it("returns 401 for missing password", async () => {
    const POST = await importPOST()
    const request = createAuthRequest({})
    const response = await POST(request)

    expect(response.status).toBe(401)
  })

  it("returns 401 for malformed body", async () => {
    const POST = await importPOST()
    // Send a request with invalid JSON by creating a request with no body
    const request = new NextRequest(
      new URL("/api/auth", "http://localhost:3000"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }
    )
    const response = await POST(request)

    expect(response.status).toBe(401)
  })

  it("sets cookie with 30-day maxAge", async () => {
    const POST = await importPOST()
    const request = createAuthRequest({ password: "test-password-123" })
    const response = await POST(request)

    const setCookie = response.headers.get("set-cookie")
    // 30 days = 2592000 seconds
    expect(setCookie).toContain("Max-Age=2592000")
  })
})

describe("auth API sign-out (DELETE)", () => {
  async function importDELETE() {
    const mod = await import("../app/api/auth/route")
    return mod.DELETE
  }

  it("returns 200 with success: true", async () => {
    const DELETE = await importDELETE()
    const response = await DELETE()

    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.success).toBe(true)
  })

  it("clears fintrack-session cookie with maxAge=0", async () => {
    const DELETE = await importDELETE()
    const response = await DELETE()

    const setCookie = response.headers.get("set-cookie")
    expect(setCookie).toBeTruthy()
    expect(setCookie).toContain("fintrack-session")
    expect(setCookie).toContain("Max-Age=0")
  })

  it("sets cookie with httpOnly flag", async () => {
    const DELETE = await importDELETE()
    const response = await DELETE()

    const setCookie = response.headers.get("set-cookie")
    expect(setCookie).toContain("HttpOnly")
  })

  it("sets cookie with path=/", async () => {
    const DELETE = await importDELETE()
    const response = await DELETE()

    const setCookie = response.headers.get("set-cookie")
    expect(setCookie).toContain("Path=/")
  })
})
