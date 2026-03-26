import { NextRequest, NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"

function parseUserAgent(ua: string): { browser: string; os: string } {
  let browser = "Unknown"
  let os = "Unknown"

  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome"
  else if (ua.includes("Edg")) browser = "Edge"
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari"
  else if (ua.includes("Firefox")) browser = "Firefox"

  if (ua.includes("Mac OS")) os = "macOS"
  else if (ua.includes("Windows")) os = "Windows"
  else if (ua.includes("Linux")) os = "Linux"
  else if (ua.includes("iPhone")) os = "iOS"
  else if (ua.includes("Android")) os = "Android"

  return { browser, os }
}

async function hashVisitorId(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hash = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16)
}

async function logLogin(request: NextRequest) {
  try {
    const supabase = createServerSupabase()

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"
    const city = request.headers.get("x-vercel-ip-city") || null
    const region = request.headers.get("x-vercel-ip-country-region") || null
    const country = request.headers.get("x-vercel-ip-country") || null

    const { browser, os } = parseUserAgent(userAgent)
    const visitorId = await hashVisitorId(`${ip}|${userAgent}`)

    // Count previous logins from this visitor
    const { count } = await supabase
      .from("login_log")
      .select("*", { count: "exact", head: true })
      .eq("visitor_id", visitorId)

    await supabase.from("login_log").insert({
      visitor_id: visitorId,
      attempt_number: (count ?? 0) + 1,
      ip_address: ip,
      user_agent: userAgent,
      browser,
      os,
      city: city ? decodeURIComponent(city) : null,
      region,
      country,
    })
  } catch (err) {
    // Don't block login if logging fails
    console.error("Failed to log login:", err)
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.set({
    name: "fintrack-session",
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  })
  return response
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password } = body

    if (!password || password !== process.env.APP_PASSWORD) {
      return NextResponse.json(
        { error: "Incorrect password" },
        { status: 401 }
      )
    }

    // Log the successful login (non-blocking)
    logLogin(request)

    const sessionToken = crypto.randomUUID()

    const response = NextResponse.json({ success: true })
    response.cookies.set({
      name: "fintrack-session",
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    })

    return response
  } catch {
    // Malformed or missing JSON body
    return NextResponse.json(
      { error: "Incorrect password" },
      { status: 401 }
    )
  }
}
