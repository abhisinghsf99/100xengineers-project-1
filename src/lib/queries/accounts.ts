import { createServerSupabase } from "@/lib/supabase/server"
import type { Account } from "./types"

export async function getAccounts(): Promise<Account[]> {
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: true })

  if (error) throw new Error(`Failed to fetch accounts: ${error.message}`)
  return data as Account[]
}
