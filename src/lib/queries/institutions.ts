import { createServerSupabase } from "@/lib/supabase/server"
import type { Institution } from "./types"

export async function getInstitutions(): Promise<Institution[]> {
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from("institutions")
    .select("*")
    .order("created_at", { ascending: true })

  if (error)
    throw new Error(`Failed to fetch institutions: ${error.message}`)
  return data as Institution[]
}
