<script setup lang="ts">
import type { OrderRow, ProcessStatus } from '@/server/db/schema'
import { formatMoney } from '@/utils/formatMoney'

definePageMeta({ requiresAuth: true })

const { t } = useI18n()
const router = useRouter()
const { play, muted, toggleMute } = useChime()

const statusOptions: Array<{ value: ProcessStatus; label: string }> = [
  { value: 'open', label: 'orders.statusBadge.open' },
  { value: 'processing', label: 'orders.statusBadge.processing' },
  { value: 'done', label: 'orders.statusBadge.done' },
  { value: 'error', label: 'orders.statusBadge.error' },
  { value: 'closed', label: 'orders.statusBadge.closed' },
  { value: 'refund', label: 'orders.statusBadge.refund' },
]

const selectedStatuses = ref<ProcessStatus[]>(['open', 'processing'])
const gameFilter = ref('')
const supplierFilter = ref('')
const search = ref('')
const orders = ref<OrderRow[]>([])
const loading = ref(false)
const busyId = ref<string | null>(null)
const { data: gamesData } = await useFetch<{ games: { key: string; name: string }[] }>('/api/admin/games')
const { data: suppliersData } = await useFetch<{ suppliers: { key: string; name: string }[] }>('/api/admin/suppliers')

const statusQuery = computed(() => selectedStatuses.value.join(','))

async function load() {
  loading.value = true
  try {
    const res = await $fetch<{ orders: OrderRow[] }>('/api/orders', {
      params: {
        status: statusQuery.value || undefined,
        gameKey: gameFilter.value || undefined,
        supplierKey: supplierFilter.value || undefined,
        search: search.value || undefined,
        limit: 100,
      },
    })
    orders.value = res.orders
  } finally {
    loading.value = false
  }
}

await load()

watch([statusQuery, gameFilter, supplierFilter], () => load())

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(load, 250)
})

useOrderRealtime((ev) => {
  if (ev.type === 'INSERT') {
    orders.value = [ev.order, ...orders.value]
    play()
  } else if (ev.type === 'UPDATE') {
    const idx = orders.value.findIndex((o) => o.id === ev.order.id)
    if (idx >= 0) orders.value[idx] = ev.order
    else if (selectedStatuses.value.includes(ev.order.processStatus)) orders.value = [ev.order, ...orders.value]
  } else if (ev.type === 'DELETE') {
    orders.value = orders.value.filter((o) => o.id !== ev.order.id)
  }
})

function toggleStatus(s: ProcessStatus) {
  if (selectedStatuses.value.includes(s)) {
    selectedStatuses.value = selectedStatuses.value.filter((x) => x !== s)
  } else {
    selectedStatuses.value = [...selectedStatuses.value, s]
  }
}

async function handleProcess(order: OrderRow) {
  busyId.value = order.id
  try {
    await $fetch(`/api/orders/${order.id}/process`, { method: 'POST' })
    await load()
  } finally {
    busyId.value = null
  }
}

async function handleDone(order: OrderRow) {
  busyId.value = order.id
  try {
    await $fetch(`/api/orders/${order.id}/done`, {
      method: 'POST',
      body: { successful: order.processPending },
    })
    await load()
  } finally {
    busyId.value = null
  }
}

async function handleReject(order: OrderRow) {
  if (!confirm('Reject this order?')) return
  busyId.value = order.id
  try {
    await $fetch(`/api/orders/${order.id}/reject`, { method: 'POST', body: {} })
    await load()
  } finally {
    busyId.value = null
  }
}

const visibleOrders = computed(() => orders.value)

const kpi = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todays = orders.value.filter((o) => new Date(o.createdAt) >= today)
  const doneCount = todays.filter((o) => o.processStatus === 'done').length
  const profit = todays.reduce((s, o) => s + Number(o.profit || 0), 0)
  const ratio = todays.length ? Math.round((doneCount / todays.length) * 100) : 0
  return { count: todays.length, profit, ratio }
})
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-6">
    <header class="mb-4 flex flex-wrap items-center gap-3">
      <h1 class="text-2xl font-semibold">{{ t('orders.title') }}</h1>
      <button class="btn-ghost ml-auto" @click="toggleMute">
        {{ muted ? t('orders.muted') : t('orders.unmuted') }}
      </button>
      <NuxtLink to="/orders/new" class="btn-primary">New order</NuxtLink>
    </header>

    <section class="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
      <div class="card p-4">
        <div class="text-xs text-zinc-500">{{ t('orders.kpi.salesCount') }}</div>
        <div class="text-2xl font-semibold">{{ kpi.count }}</div>
      </div>
      <div class="card p-4">
        <div class="text-xs text-zinc-500">{{ t('orders.kpi.profit') }}</div>
        <div class="text-2xl font-semibold">{{ formatMoney(kpi.profit) }}</div>
      </div>
      <div class="card p-4">
        <div class="text-xs text-zinc-500">{{ t('orders.kpi.doneRatio') }}</div>
        <div class="text-2xl font-semibold">{{ kpi.ratio }}%</div>
      </div>
    </section>

    <section class="mb-3 flex flex-wrap items-center gap-2">
      <button
        v-for="opt in statusOptions"
        :key="opt.value"
        class="rounded-full border px-3 py-1 text-xs transition"
        :class="selectedStatuses.includes(opt.value) ? 'border-brand-primary bg-brand-primary text-white' : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200'"
        @click="toggleStatus(opt.value)"
      >
        {{ t(opt.label) }}
      </button>

      <select v-model="gameFilter" class="input max-w-[180px]">
        <option value="">{{ t('orders.filterByGame') }}: All</option>
        <option v-for="g in gamesData?.games ?? []" :key="g.key" :value="g.key">{{ g.name }}</option>
      </select>
      <select v-model="supplierFilter" class="input max-w-[180px]">
        <option value="">{{ t('orders.filterBySupplier') }}: All</option>
        <option v-for="s in suppliersData?.suppliers ?? []" :key="s.key" :value="s.key">{{ s.name }}</option>
      </select>
      <input v-model="search" type="search" :placeholder="t('common.search')" class="input max-w-xs" />
    </section>

    <div v-if="loading && visibleOrders.length === 0" class="py-8 text-center text-sm text-zinc-500">
      {{ t('common.loading') }}
    </div>
    <div v-else-if="visibleOrders.length === 0" class="py-8 text-center text-sm text-zinc-500">
      No orders
    </div>
    <div v-else class="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <OrderCard
        v-for="order in visibleOrders"
        :key="order.id"
        :order="order"
        :busy="busyId === order.id"
        @click-process="handleProcess(order)"
        @click-done="handleDone(order)"
        @click-reject="handleReject(order)"
        @click-edit="router.push(`/orders/${order.id}/edit`)"
        @click-detail="router.push(`/orders/${order.id}`)"
      />
    </div>
  </div>
</template>
