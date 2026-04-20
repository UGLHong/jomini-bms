<script setup lang="ts">
import type { OrderRow } from '@/server/db/schema'
import { formatDateTime } from '@/utils/formatDate'
import { formatMoney } from '@/utils/formatMoney'

definePageMeta({ requiresAuth: true })

const route = useRoute()
const router = useRouter()
const orderId = computed(() => String(route.params.id))

const { data, refresh } = await useFetch<{ order: OrderRow }>(() => `/api/orders/${orderId.value}`)
const order = computed(() => data.value?.order)

type SubmissionRow = {
  id: string
  idtrx: string
  serviceId: string
  target: string
  contact: string
  externalInvoice: string | null
  status: string
  attempts: Array<{ at: string; kind: 'submit' | 'status'; ok: boolean; message?: string }>
  lastCheckedAt: string | null
  createdAt: string
  updatedAt: string
}

const { data: submissionsData, refresh: refreshSubmissions } = await useFetch<{ submissions: SubmissionRow[] }>(
  () => `/api/orders/${orderId.value}/submissions`,
)
const submissions = computed(() => submissionsData.value?.submissions ?? [])

useOrderRealtime((ev) => {
  if (ev.order.id === orderId.value) {
    refresh()
    refreshSubmissions()
  }
})

const busy = ref(false)

async function withBusy<T>(fn: () => Promise<T>) {
  busy.value = true
  try {
    await fn()
    await Promise.all([refresh(), refreshSubmissions()])
  } finally {
    busy.value = false
  }
}

async function handleResubmit() {
  await withBusy(() => $fetch(`/api/orders/${orderId.value}/resubmit`, { method: 'POST' }))
}

const canResubmit = computed(() => order.value?.processStatus === 'processing')

async function handleProcess() {
  await withBusy(() => $fetch(`/api/orders/${orderId.value}/process`, { method: 'POST' }))
}
async function handleDone() {
  if (!order.value) return
  await withBusy(() =>
    $fetch(`/api/orders/${orderId.value}/done`, {
      method: 'POST',
      body: { successful: order.value?.processPending ?? [] },
    }),
  )
}
async function handleReject() {
  const remark = prompt('Reject reason?') ?? undefined
  await withBusy(() => $fetch(`/api/orders/${orderId.value}/reject`, { method: 'POST', body: { remark } }))
}
async function handleRefund() {
  const remark = prompt('Refund reason?') ?? undefined
  await withBusy(() => $fetch(`/api/orders/${orderId.value}/refund`, { method: 'POST', body: { remark } }))
}
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-6">
    <button class="mb-4 text-sm text-zinc-600 hover:text-brand-primary" @click="router.back()">← Back</button>

    <div v-if="!order" class="py-8 text-center text-sm text-zinc-500">Loading...</div>
    <div v-else class="space-y-4">
      <OrderCard
        :order="order"
        expanded
        :busy="busy"
        @click-process="handleProcess"
        @click-done="handleDone"
        @click-reject="handleReject"
        @click-edit="router.push(`/orders/${order.id}/edit`)"
      />

      <section class="card p-4">
        <h2 class="mb-2 text-lg font-semibold">Processing history</h2>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <div class="text-xs uppercase tracking-wide text-zinc-500">Successful splits</div>
            <pre class="rounded-md bg-zinc-50 p-3 text-xs dark:bg-zinc-900">{{ JSON.stringify(order.processSuccessful, null, 2) }}</pre>
          </div>
          <div>
            <div class="text-xs uppercase tracking-wide text-zinc-500">Pending splits</div>
            <pre class="rounded-md bg-zinc-50 p-3 text-xs dark:bg-zinc-900">{{ JSON.stringify(order.processPending, null, 2) }}</pre>
          </div>
          <div v-if="order.processFailed?.length">
            <div class="text-xs uppercase tracking-wide text-zinc-500">Failed splits</div>
            <pre class="rounded-md bg-zinc-50 p-3 text-xs dark:bg-zinc-900">{{ JSON.stringify(order.processFailed, null, 2) }}</pre>
          </div>
        </div>
      </section>

      <SupplierSubmissionsPanel
        :submissions="submissions"
        :can-resubmit="canResubmit"
        :busy="busy"
        @resubmit="handleResubmit"
      />

      <section class="card p-4">
        <h2 class="mb-2 text-lg font-semibold">Financials</h2>
        <dl class="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
          <div>
            <dt class="text-xs text-zinc-500">Paid</dt>
            <dd>{{ formatMoney(order.paidAmount) }}</dd>
          </div>
          <div>
            <dt class="text-xs text-zinc-500">Cost</dt>
            <dd>{{ formatMoney(order.costPrice) }}</dd>
          </div>
          <div>
            <dt class="text-xs text-zinc-500">Profit</dt>
            <dd>{{ formatMoney(order.profit) }}</dd>
          </div>
          <div>
            <dt class="text-xs text-zinc-500">Done at</dt>
            <dd>{{ order.doneAt ? formatDateTime(order.doneAt) : '—' }}</dd>
          </div>
        </dl>
      </section>

      <div class="flex flex-wrap gap-2">
        <button class="btn-ghost" :disabled="busy" @click="handleRefund">Refund</button>
      </div>
    </div>
  </div>
</template>
