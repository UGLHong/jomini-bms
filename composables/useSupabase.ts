import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function useSupabase(): SupabaseClient | null {
  if (!import.meta.client) return null
  if (client) return client
  const { public: pub } = useRuntimeConfig()
  if (!pub.supabaseUrl || !pub.supabaseAnonKey) return null

  client = createClient(pub.supabaseUrl, pub.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 10 } },
  })
  return client
}
