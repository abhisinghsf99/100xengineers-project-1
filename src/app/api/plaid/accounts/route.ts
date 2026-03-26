import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { EXCLUDED_SUBTYPES } from '@/lib/plaid/excluded-accounts'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createServerSupabase()

  const { data: institutions } = await supabase
    .from('institutions')
    .select('*, accounts(*)')
    .order('created_at', { ascending: true })

  // Filter out excluded account subtypes
  const filtered = (institutions || []).map((inst: Record<string, unknown> & { accounts: Array<Record<string, unknown> & { subtype: string | null }> }) => ({
    ...inst,
    accounts: inst.accounts.filter(a => !EXCLUDED_SUBTYPES.has(a.subtype ?? '')),
  }))

  return NextResponse.json({ institutions: filtered })
}
