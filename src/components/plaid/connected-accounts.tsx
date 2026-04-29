'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, RefreshCw, Loader2, Download } from 'lucide-react'

interface ConnectedAccount {
  id: string
  name: string
  type: string
  subtype: string | null
  mask: string | null
  balance_current: number | null
}

interface ConnectedInstitution {
  id: string
  institution_name: string
  status: string
  accounts: ConnectedAccount[]
}

export function ConnectedAccounts() {
  const [institutions, setInstitutions] = useState<ConnectedInstitution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/plaid/accounts')
      const data = await res.json()
      setInstitutions(data.institutions || [])
    } catch (err) {
      console.error('Failed to fetch accounts:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      await fetch('/api/plaid/sync', { method: 'POST' })
      await fetchAccounts()
      window.location.reload()
    } catch (err) {
      console.error('Sync failed:', err)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSeed = async () => {
    setIsSeeding(true)
    try {
      const res = await fetch('/api/plaid/seed', { method: 'POST' })
      if (res.ok) {
        await fetchAccounts()
        window.location.reload()
      } else {
        const data = await res.json()
        console.error('Seed failed:', data.error)
      }
    } catch (err) {
      console.error('Seed failed:', err)
    } finally {
      setIsSeeding(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-lg font-semibold">Connected Banks</CardTitle>
        <div className="flex items-center gap-2">
          {institutions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
              )}
              Sync
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSeed}
            disabled={isSeeding}
          >
            {isSeeding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Load Sandbox Data
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {institutions.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-sm mb-1">
              No bank accounts loaded yet
            </p>
            <p className="text-muted-foreground/70 text-xs">
              Click &quot;Load Sandbox Data&quot; to pull test accounts from the Plaid sandbox
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {institutions.map(inst => (
              <div key={inst.id} className="border border-border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{inst.institution_name}</span>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                    inst.status === 'active'
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    {inst.status}
                  </span>
                </div>
                <div className="space-y-1">
                  {inst.accounts.map(acc => (
                    <div key={acc.id} className="flex items-center justify-between text-sm pl-6">
                      <span className="text-muted-foreground">
                        {acc.name} {acc.mask ? `••${acc.mask}` : ''}
                      </span>
                      <span className="font-mono text-xs">
                        {acc.balance_current != null
                          ? `$${Math.abs(acc.balance_current).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                          : '—'
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
