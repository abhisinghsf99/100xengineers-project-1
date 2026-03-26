import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { plaidClient } from '@/lib/plaid/client'
import { syncTransactions } from '@/lib/plaid/sync'
import { EXCLUDED_SUBTYPES } from '@/lib/plaid/excluded-accounts'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const supabase = createServerSupabase()

    // Get all institutions (which store access tokens and cursors)
    const { data: institutions } = await supabase
      .from('institutions')
      .select('id, plaid_access_token, plaid_item_id')

    if (!institutions || institutions.length === 0) {
      return NextResponse.json({ message: 'No linked accounts to sync' })
    }

    // Sync transactions for all institutions
    const results = await Promise.all(
      institutions.map(inst =>
        syncTransactions(inst.id)
          .then(result => ({ institution_id: inst.id, ...result }))
          .catch(err => ({ institution_id: inst.id, error: err.message }))
      )
    )

    // Also refresh account balances
    for (const inst of institutions) {
      try {
        const balanceResponse = await plaidClient.accountsGet({
          access_token: inst.plaid_access_token,
        })

        for (const account of balanceResponse.data.accounts) {
          // Skip excluded account subtypes
          if (EXCLUDED_SUBTYPES.has(account.subtype ?? '')) continue

          await supabase
            .from('accounts')
            .update({
              balance_available: account.balances.available,
              balance_current: account.balances.current,
              balance_limit: account.balances.limit,
              balance_updated_at: new Date().toISOString(),
            })
            .eq('plaid_account_id', account.account_id)
        }
      } catch (err) {
        console.error(`Failed to refresh balances for ${inst.plaid_item_id}:`, err)
      }
    }

    return NextResponse.json({ results })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Sync failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
