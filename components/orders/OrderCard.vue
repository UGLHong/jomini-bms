<script setup lang="ts">
import type { OrderRow } from '@/server/db/schema'
import { formatMoney } from '@/utils/formatMoney'
import { formatDateTime, formatRelative } from '@/utils/formatDate'

const props = defineProps<{
  order: OrderRow
  expanded?: boolean
  busy?: boolean
}>()

const emit = defineEmits<{
  (e: 'click-process'): void
  (e: 'click-done'): void
  (e: 'click-reject'): void
  (e: 'click-edit'): void
  (e: 'click-detail'): void
  (e: 'toggle-receipt'): void
}>()

const { t } = useI18n()

const showReceipt = ref(false)
function handleReceiptToggle() {
  showReceipt.value = !showReceipt.value
  emit('toggle-receipt')
}

const isOpen = computed(() => props.order.processStatus === 'open')
const isProcessing = computed(() => props.order.processStatus === 'processing')
const isTerminal = computed(() => ['done', 'closed', 'refund'].includes(props.order.processStatus))

function copyOrderId() {
  navigator.clipboard.writeText(props.order.id)
}
</script>

<template>
  <article class="card p-4">
    <header class="flex flex-wrap items-center gap-2">
      <button
        class="font-mono text-xs text-zinc-500 hover:text-brand-primary"
        :title="t('orders.actions.copyOrderId')"
        @click="copyOrderId"
      >
        #{{ order.id }}
      </button>
      <OrderStatusBadge :status="order.processStatus" />
      <span class="text-sm font-medium">{{ order.gameKey }}</span>
      <span class="text-sm text-zinc-600 dark:text-zinc-300">{{ order.supplierKey }}</span>
      <span class="ml-auto text-xs text-zinc-500" :title="formatDateTime(order.createdAt)">
        {{ formatRelative(order.createdAt) }}
      </span>
    </header>

    <section class="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
      <div>
        <div class="text-xs text-zinc-500">Customer</div>
        <div class="truncate font-medium">{{ order.fullname || '—' }}</div>
      </div>
      <div>
        <div class="text-xs text-zinc-500">Game ID</div>
        <div class="truncate font-mono text-xs">{{ order.gameId || '—' }}</div>
      </div>
      <div>
        <div class="text-xs text-zinc-500">Buy / Paid</div>
        <div class="truncate">{{ order.buyAmount }} / {{ formatMoney(order.paidAmount) }}</div>
      </div>
      <div>
        <div class="text-xs text-zinc-500">Split</div>
        <div class="truncate font-mono text-xs">{{ order.amountCombinationString || '—' }}</div>
      </div>
    </section>

    <section v-if="expanded" class="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
      <div>
        <div class="text-xs text-zinc-500">Cost / Profit</div>
        <div>{{ formatMoney(order.costPrice) }} / {{ formatMoney(order.profit) }}</div>
      </div>
      <div>
        <div class="text-xs text-zinc-500">Phone</div>
        <div class="truncate">{{ order.phone || '—' }}</div>
      </div>
      <div>
        <div class="text-xs text-zinc-500">Prev orders</div>
        <div>{{ order.prevOrderCount }} / ID {{ order.prevOrderIdCount }}</div>
      </div>
      <div v-if="order.remark" class="col-span-full">
        <div class="text-xs text-zinc-500">Remark</div>
        <div class="whitespace-pre-wrap">{{ order.remark }}</div>
      </div>
    </section>

    <section v-if="showReceipt && order.receiptUrl" class="mt-3">
      <img
        :src="order.receiptUrl"
        alt="Receipt"
        class="max-h-96 rounded-md border border-zinc-200 dark:border-zinc-800"
      >
    </section>

    <footer class="mt-4 flex flex-wrap gap-2">
      <button v-if="isOpen" class="btn-primary" :disabled="busy" @click="emit('click-process')">
        {{ t('orders.actions.process') }}
      </button>
      <button v-if="isProcessing" class="btn-primary" :disabled="busy" @click="emit('click-done')">
        {{ t('orders.actions.done') }}
      </button>
      <button v-if="!isTerminal" class="btn-secondary" :disabled="busy" @click="emit('click-edit')">
        {{ t('orders.actions.edit') }}
      </button>
      <button v-if="!isTerminal" class="btn-ghost" :disabled="busy" @click="emit('click-reject')">
        {{ t('orders.actions.reject') }}
      </button>
      <button v-if="order.receiptUrl" class="btn-ghost" @click="handleReceiptToggle">
        {{ showReceipt ? t('orders.actions.hideReceipt') : t('orders.actions.showReceipt') }}
      </button>
      <button class="btn-ghost ml-auto" @click="emit('click-detail')">Details →</button>
    </footer>
  </article>
</template>
