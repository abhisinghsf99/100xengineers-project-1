import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createServerSupabase } from '@/lib/supabase/server'
import { EXCLUDED_SUBTYPES } from '@/lib/plaid/excluded-accounts'
import { Products, SandboxPublicTokenCreateRequestOptions } from 'plaid'

export const maxDuration = 60;

/**
 * Seeds sandbox data by creating a test item via Plaid's sandbox API,
 * then pulling accounts and transactions into Supabase.
 * Uses transactionsGet (not transactionsSync) because sandbox items
 * don't have sync data available immediately after creation.
 */
export async function POST() {
  try {
    const supabase = createServerSupabase()

    // Clear all existing data to prevent duplicates on re-seed
    await supabase.from('credit_liability_aprs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('credit_liabilities').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('sync_log').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('accounts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('institutions').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Use Plaid sandbox to create a public token directly (no Link UI needed)
    const sandboxResponse = await plaidClient.sandboxPublicTokenCreate({
      institution_id: 'ins_109508', // First Platypus Bank (sandbox)
      initial_products: [Products.Transactions],
      options: {
        webhook: '',
      } as SandboxPublicTokenCreateRequestOptions,
    })

    const publicToken = sandboxResponse.data.public_token

    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    })

    const accessToken = exchangeResponse.data.access_token
    const itemId = exchangeResponse.data.item_id

    // Store institution
    const { data: institution } = await supabase
      .from('institutions')
      .upsert({
        plaid_item_id: itemId,
        plaid_access_token: accessToken,
        sync_cursor: null,
        institution_name: 'First Platypus Bank',
        institution_id: 'ins_109508',
        status: 'active',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'plaid_item_id' })
      .select('id')
      .single()

    // Fetch and store accounts
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    })

    const filteredAccounts = accountsResponse.data.accounts.filter(
      account => !EXCLUDED_SUBTYPES.has(account.subtype ?? '')
    )

    const accountsToInsert = filteredAccounts.map(account => ({
      plaid_account_id: account.account_id,
      institution_id: institution?.id,
      name: account.name,
      official_name: account.official_name,
      type: account.type,
      subtype: account.subtype,
      mask: account.mask,
      balance_available: account.balances.available,
      balance_current: account.balances.current,
      balance_limit: account.balances.limit,
      balance_updated_at: new Date().toISOString(),
    }))

    await supabase
      .from('accounts')
      .upsert(accountsToInsert, { onConflict: 'plaid_account_id' })

    // Build account map (plaid_account_id -> our UUID)
    const { data: dbAccounts } = await supabase
      .from('accounts')
      .select('id, plaid_account_id')

    const accountMap = new Map(
      (dbAccounts || []).map((a: { id: string; plaid_account_id: string }) => [a.plaid_account_id, a.id])
    )

    // Fetch transactions via transactionsGet with retry.
    // Sandbox items need a few seconds before transactions are ready.
    const now = new Date()
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - 365)

    let allTransactions: import('plaid').Transaction[] = []

    for (let attempt = 1; attempt <= 5; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 3000))

      try {
        let totalTransactions = Infinity
        let offset = 0
        allTransactions = []

        while (allTransactions.length < totalTransactions) {
          const txnResponse = await plaidClient.transactionsGet({
            access_token: accessToken,
            start_date: startDate.toISOString().split('T')[0],
            end_date: now.toISOString().split('T')[0],
            options: { count: 500, offset },
          })

          allTransactions = allTransactions.concat(txnResponse.data.transactions)
          totalTransactions = txnResponse.data.total_transactions
          offset = allTransactions.length
        }
        break // success
      } catch (err: unknown) {
        const plaidError = (err as { response?: { data?: { error_code?: string } } })?.response?.data?.error_code
        if (plaidError === 'PRODUCT_NOT_READY' && attempt < 5) {
          continue // retry
        }
        throw err
      }
    }

    // Upsert transactions into Supabase
    const toUpsert = allTransactions.map(txn => ({
      plaid_transaction_id: txn.transaction_id,
      account_id: accountMap.get(txn.account_id) || txn.account_id,
      amount: txn.amount,
      date: txn.date,
      datetime: txn.datetime || null,
      name: txn.name,
      merchant_name: txn.merchant_name || null,
      merchant_entity_id: txn.merchant_entity_id || null,
      category_primary: txn.personal_finance_category?.primary || null,
      category_detailed: txn.personal_finance_category?.detailed || null,
      payment_channel: txn.payment_channel || null,
      is_pending: txn.pending,
      pending_transaction_id: txn.pending_transaction_id || null,
      iso_currency_code: txn.iso_currency_code || 'USD',
      logo_url: txn.logo_url || null,
      website: txn.website || null,
      updated_at: new Date().toISOString(),
    }))

    if (toUpsert.length > 0) {
      // Batch in chunks of 500 to avoid payload limits
      for (let i = 0; i < toUpsert.length; i += 500) {
        const chunk = toUpsert.slice(i, i + 500)
        const { error } = await supabase
          .from('transactions')
          .upsert(chunk, { onConflict: 'plaid_transaction_id' })
        if (error) throw new Error(`Failed to upsert transactions: ${error.message}`)
      }
    }

    // Seed credit liabilities and APRs for credit cards and loans
    const { data: liabilityAccounts } = await supabase
      .from('accounts')
      .select('id, name, type, subtype, balance_current')
      .in('type', ['credit', 'loan'])

    // Override mortgage balance to realistic amount
    for (const acc of liabilityAccounts || []) {
      if (acc.subtype === 'mortgage') {
        await supabase.from('accounts').update({ balance_current: 729103.37 }).eq('id', acc.id)
        acc.balance_current = 729103.37
      }
    }

    // APR configs by subtype
    const aprConfigs: Record<string, { apr: number; cashApr?: number; btApr?: number; minPay: (b: number) => number }> = {
      'credit card': { apr: 21.99, cashApr: 25.49, btApr: 15.99, minPay: (b) => Math.max(25, Math.round(b * 0.02 * 100) / 100) },
      'student': { apr: 3.625, cashApr: 5.50, minPay: (b) => Math.max(350, Math.round(b * 0.005 * 100) / 100) },
      'mortgage': { apr: 3.25, minPay: () => 4250 },
    }

    let liabilitiesAdded = 0
    for (const acc of liabilityAccounts || []) {
      const balance = Number(acc.balance_current) || 410
      const config = aprConfigs[acc.subtype ?? ''] ?? aprConfigs['credit card']

      const { data: liability } = await supabase
        .from('credit_liabilities')
        .insert({
          account_id: acc.id,
          is_overdue: false,
          last_payment_amount: Math.round(balance * 0.03 * 100) / 100,
          last_payment_date: new Date(Date.now() - 15 * 86400000).toISOString().split('T')[0],
          last_statement_issue_date: new Date(Date.now() - 20 * 86400000).toISOString().split('T')[0],
          last_statement_balance: balance,
          minimum_payment_amount: config.minPay(balance),
          next_payment_due_date: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
        })
        .select('id')
        .single()

      if (liability) {
        liabilitiesAdded++
        const aprs: { credit_liability_id: string; apr_percentage: number; apr_type: string; balance_subject_to_apr: number; interest_charge_amount: number }[] = [
          {
            credit_liability_id: liability.id,
            apr_percentage: config.apr,
            apr_type: 'purchase_apr',
            balance_subject_to_apr: balance,
            interest_charge_amount: Math.round(balance * config.apr / 100 / 12 * 100) / 100,
          },
        ]
        if (config.cashApr) {
          aprs.push({
            credit_liability_id: liability.id,
            apr_percentage: config.cashApr,
            apr_type: 'cash_apr' ,
            balance_subject_to_apr: 0,
            interest_charge_amount: 0,
          })
        }
        if (config.btApr) {
          aprs.push({
            credit_liability_id: liability.id,
            apr_percentage: config.btApr,
            apr_type: 'balance_transfer_apr' ,
            balance_subject_to_apr: 0,
            interest_charge_amount: 0,
          })
        }
        await supabase.from('credit_liability_aprs').insert(aprs)
      }
    }

    return NextResponse.json({
      success: true,
      institution: 'First Platypus Bank',
      accounts_added: accountsToInsert.length,
      transactions_added: allTransactions.length,
      liabilities_added: liabilitiesAdded,
    })
  } catch (error: unknown) {
    console.error('Sandbox seed error:', error)
    const message = error instanceof Error ? error.message : 'Failed to seed sandbox data'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
