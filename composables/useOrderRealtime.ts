import type { RealtimeChannel } from '@supabase/supabase-js'
import type { OrderRow } from '@/server/db/schema'

type OrderEvent =
  | { type: 'INSERT'; order: OrderRow }
  | { type: 'UPDATE'; order: OrderRow }
  | { type: 'DELETE'; order: OrderRow }

export function useOrderRealtime(onEvent: (ev: OrderEvent) => void) {
  const supabase = useSupabase()
  let channel: RealtimeChannel | null = null

  onMounted(() => {
    if (!supabase) return
    channel = supabase
      .channel('orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order' }, (payload) => {
        const newRow = payload.new as OrderRow | undefined
        const oldRow = payload.old as OrderRow | undefined
        if (payload.eventType === 'INSERT' && newRow) onEvent({ type: 'INSERT', order: newRow })
        else if (payload.eventType === 'UPDATE' && newRow) onEvent({ type: 'UPDATE', order: newRow })
        else if (payload.eventType === 'DELETE' && oldRow) onEvent({ type: 'DELETE', order: oldRow })
      })
      .subscribe()
  })

  onBeforeUnmount(() => {
    if (channel && supabase) supabase.removeChannel(channel)
    channel = null
  })
}
