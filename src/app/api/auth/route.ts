import { NextRequest, NextResponse } from "next/server"

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
