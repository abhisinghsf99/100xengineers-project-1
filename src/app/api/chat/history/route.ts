import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/chat/history
 * Saves new chat messages to the database.
 */
export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json()

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 })
    }

    const supabase = createServerSupabase()

    const rows = messages.map((m: { id: string; role: string; content: string }) => ({
      id: m.id,
      role: m.role,
      content: m.content,
    }))

    const { error } = await supabase
      .from('chat_messages')
      .upsert(rows, { onConflict: 'id' })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, saved: rows.length })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

/**
 * GET /api/chat/history
 * Returns all chat messages ordered by creation time.
 */
export async function GET() {
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ messages: data || [] })
}

/**
 * DELETE /api/chat/history
 * Clears all chat messages (the "new chat" action).
 */
export async function DELETE() {
  const supabase = createServerSupabase()
  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .neq('id', '')  // delete all rows

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
