<script setup lang="ts">
import { formatMoney } from '@/utils/formatMoney'

definePageMeta({ requiresAuth: true })

const { t } = useI18n()

const today = new Date()
const weekAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)
const toIso = (date: Date) => date.toISOString().slice(0, 10)

const filters = reactive({
  from: toIso(weekAgo),
  to: toIso(today),
  gameKey: '',
  supplierKey: '',
})

const { data: gamesData } = await useFetch<{ games: { key: string; name: string }[] }>('/api/admin/games')
const { data: suppliersData } = await useFetch<{ suppliers: { key: string; name: string }[] }>('/api/admin/suppliers')

type ReportResp = {
  kpi: {
    totalOrders: number
    totalDone: number
    totalIncome: number
    totalCost: number
    totalProfit: number
    doneRatio: number
  }
  series: Array<{ date: string; count: number; profit: number }>
  breakdown: Array<{ gameKey: string; supplierKey: string; count: number; doneCount: number; profit: number }>
}

const loading = ref(false)
const report = ref<ReportResp | null>(null)

async function reload() {
  loading.value = true
  try {
    const toDate = new Date(filters.to)
    toDate.setHours(23, 59, 59, 999)
    report.value = await $fetch<ReportResp>('/api/reports', {
      query: {
        from: new Date(filters.from).toISOString(),
        to: toDate.toISOString(),
        gameKey: filters.gameKey || undefined,
        supplierKey: filters.supplierKey || undefined,
      },
    })
  } finally {
    loading.value = false
  }
}

await reload()

function buildDownloadUrl(kind: 'orders' | 'summary'): string {
  const params = new URLSearchParams()
  const toDate = new Date(filters.to)
  toDate.setHours(23, 59, 59, 999)
  params.set('from', new Date(filters.from).toISOString())
  params.set('to', toDate.toISOString())
  if (filters.gameKey) params.set('gameKey', filters.gameKey)
  if (filters.supplierKey) params.set('supplierKey', filters.supplierKey)
  return `/api/reports/${kind}.csv?${params.toString()}`
}

const countSeries = computed(() =>
  (report.value?.series ?? []).map((s) => ({ label: s.date.slice(5), value: s.count })),
)
const profitSeries = computed(() =>
  (report.value?.series ?? []).map((s) => ({ label: s.date.slice(5), value: Math.round(s.profit * 100) / 100 })),
)
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-6">
    <header class="mb-4 flex flex-wrap items-center gap-3">
      <h1 class="text-2xl font-semibold">{{ t('reports.title') }}</h1>
      <a :href="buildDownloadUrl('summary')" class="btn-ghost ml-auto">{{ t('reports.download.summary') }}</a>
      <a :href="buildDownloadUrl('orders')" class="btn-secondary">{{ t('reports.download.orders') }}</a>
    </header>

    <section class="card mb-4 flex flex-wrap items-end gap-3 p-4">
      <div>
        <label class="label">{{ t('reports.filters.from') }}</label>
        <input v-model="filters.from" type="date" class="input" />
      </div>
      <div>
        <label class="label">{{ t('reports.filters.to') }}</label>
        <input v-model="filters.to" type="date" class="input" />
      </div>
      <div>
        <label class="label">{{ t('reports.filters.game') }}</label>
        <select v-model="filters.gameKey" class="input">
          <option value="">All</option>
          <option v-for="g in gamesData?.games ?? []" :key="g.key" :value="g.key">{{ g.name }}</option>
        </select>
      </div>
      <div>
        <label class="label">{{ t('reports.filters.supplier') }}</label>
        <select v-model="filters.supplierKey" class="input">
          <option value="">All</option>
          <option v-for="s in suppliersData?.suppliers ?? []" :key="s.key" :value="s.key">{{ s.name }}</option>
        </select>
      </div>
      <button class="btn-primary" :disabled="loading" @click="reload">
        {{ t('reports.filters.apply') }}
      </button>
    </section>

    <section v-if="report" class="grid grid-cols-2 gap-3 md:grid-cols-5">
      <div class="card p-4">
        <div class="text-xs text-zinc-500">{{ t('reports.kpi.salesCount') }}</div>
        <div class="text-2xl font-semibold">{{ report.kpi.totalOrders }}</div>
      </div>
      <div class="card p-4">
        <div class="text-xs text-zinc-500">{{ t('reports.kpi.income') }}</div>
        <div class="text-2xl font-semibold">{{ formatMoney(report.kpi.totalIncome) }}</div>
      </div>
      <div class="card p-4">
        <div class="text-xs text-zinc-500">{{ t('reports.kpi.cost') }}</div>
        <div class="text-2xl font-semibold">{{ formatMoney(report.kpi.totalCost) }}</div>
      </div>
      <div class="card p-4">
        <div class="text-xs text-zinc-500">{{ t('reports.kpi.profit') }}</div>
        <div class="text-2xl font-semibold">{{ formatMoney(report.kpi.totalProfit) }}</div>
      </div>
      <div class="card p-4">
        <div class="text-xs text-zinc-500">{{ t('reports.kpi.doneRatio') }}</div>
        <div class="text-2xl font-semibold">{{ report.kpi.doneRatio }}%</div>
      </div>
    </section>

    <section v-if="report" class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div class="card p-4">
        <h3 class="mb-2 text-sm font-semibold">Orders per day</h3>
        <div class="h-40">
          <MiniBarChart :data="countSeries" :height="140" />
        </div>
      </div>
      <div class="card p-4">
        <h3 class="mb-2 text-sm font-semibold">Profit per day</h3>
        <div class="h-40">
          <MiniBarChart :data="profitSeries" :height="140" />
        </div>
      </div>
    </section>

    <section v-if="report && report.breakdown.length" class="card mt-4 overflow-hidden">
      <table class="min-w-full text-sm">
        <thead class="bg-zinc-50 text-left dark:bg-zinc-900">
          <tr>
            <th class="px-3 py-2">Game</th>
            <th class="px-3 py-2">Supplier</th>
            <th class="px-3 py-2">Orders</th>
            <th class="px-3 py-2">Done</th>
            <th class="px-3 py-2">Profit</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800">
          <tr v-for="row in report.breakdown" :key="`${row.gameKey}-${row.supplierKey}`">
            <td class="px-3 py-2">{{ row.gameKey }}</td>
            <td class="px-3 py-2">{{ row.supplierKey }}</td>
            <td class="px-3 py-2">{{ row.count }}</td>
            <td class="px-3 py-2">{{ row.doneCount }}</td>
            <td class="px-3 py-2">{{ formatMoney(row.profit) }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>
