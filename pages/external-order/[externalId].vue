<script setup lang="ts">
import type { GameRow, ProductRow, StockRow } from '@/server/db/schema'

definePageMeta({ layout: 'public', requiresAuth: false, unprotected: true })

const route = useRoute()
const externalId = computed(() => String(route.params.externalId))

type Announcement = { title?: string; bodyMarkdown?: string }

type Bootstrap = {
  link: { externalId: string; expiresAt: string; responsePath: string }
  games: GameRow[]
  stocks: StockRow[]
  products: ProductRow[]
  announcement: Announcement | null
}

const { data, error } = await useFetch<Bootstrap>(() => `/api/public/external-link/${externalId.value}`)

const draft = ref({
  fullname: '',
  phone: '',
  email: '',
  gameKey: '',
  gameId: '',
  buyAmount: '',
  paidAmount: '',
  receiptUrl: '',
  language: 'Bahasa Melayu',
})

const submitting = ref(false)
const errorMsg = ref('')
const createdOrderId = ref('')

const selectableGames = computed(() => {
  if (!data.value) return []
  const stockByGame = new Map(data.value.stocks.map((s) => [s.gameKey, s]))
  return data.value.games.map((g) => ({
    ...g,
    stock: stockByGame.get(g.key) ?? null,
  }))
})

const amountsForSelectedGame = computed(() => {
  if (!data.value || !draft.value.gameKey) return []
  return data.value.products
    .filter((p) => p.gameKey === draft.value.gameKey && p.isBaseAmount && p.status === 'active')
    .sort((a, b) => Number(a.amount) - Number(b.amount))
})

async function handleSubmit() {
  submitting.value = true
  errorMsg.value = ''
  try {
    const res = await $fetch<{ orderId: string }>(`/api/public/external-link/${externalId.value}`, {
      method: 'POST',
      body: draft.value,
    })
    createdOrderId.value = res.orderId
  } catch (err: unknown) {
    const e = err as { statusMessage?: string; message?: string }
    errorMsg.value = e.statusMessage || e.message || 'Could not submit order'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto min-h-screen max-w-xl px-4 py-8">
    <header class="mb-6 flex items-center gap-3">
      <img src="/logo.svg" alt="Jomini" class="h-10 w-10" >
      <h1 class="text-xl font-semibold">Jomini</h1>
    </header>

    <div v-if="error" class="card p-6 text-center">
      <h2 class="text-lg font-semibold">{{ $t('customer.expired.title') }}</h2>
      <p class="mt-2 text-sm text-zinc-600">{{ $t('customer.expired.body') }}</p>
    </div>

    <div v-else-if="createdOrderId" class="card p-6 text-center">
      <h2 class="text-lg font-semibold">{{ $t('customer.success.title') }}</h2>
      <p class="mt-2 text-sm text-zinc-600">{{ $t('customer.success.body') }}</p>
      <p class="mt-3 font-mono text-sm">
        {{ $t('customer.success.orderId') }}: <span class="font-semibold">{{ createdOrderId }}</span>
      </p>
    </div>

    <template v-else-if="data">
      <section
        v-if="data.announcement?.bodyMarkdown"
        class="card mb-6 border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/40 dark:bg-amber-900/20"
      >
        <h3 v-if="data.announcement.title" class="mb-1 font-semibold">{{ data.announcement.title }}</h3>
        <p class="whitespace-pre-wrap text-zinc-700 dark:text-zinc-200">{{ data.announcement.bodyMarkdown }}</p>
      </section>

      <form class="card space-y-4 p-5" @submit.prevent="handleSubmit">
        <div>
          <h2 class="text-lg font-semibold">{{ $t('customer.form.title') }}</h2>
          <p class="text-sm text-zinc-600 dark:text-zinc-300">{{ $t('customer.form.subtitle') }}</p>
        </div>

        <p v-if="errorMsg" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
          {{ errorMsg }}
        </p>

        <div>
          <label class="label">{{ $t('customer.form.selectGame') }} *</label>
          <select v-model="draft.gameKey" class="input" required>
            <option value="">—</option>
            <option
              v-for="g in selectableGames"
              :key="g.key"
              :value="g.key"
              :disabled="g.stock?.stockAvailable === false"
            >
              {{ g.name }}<span v-if="g.stock?.stockAvailable === false"> (out of stock)</span>
            </option>
          </select>
        </div>

        <div>
          <label class="label">{{ $t('customer.form.fullname') }} *</label>
          <input v-model="draft.fullname" class="input" required >
        </div>

        <div>
          <label class="label">Phone *</label>
          <input v-model="draft.phone" type="tel" class="input" required >
        </div>

        <div>
          <label class="label">{{ $t('customer.form.gameId') }} *</label>
          <input v-model="draft.gameId" class="input" required >
        </div>

        <div>
          <label class="label">{{ $t('customer.form.buyAmount') }} *</label>
          <select v-if="amountsForSelectedGame.length" v-model="draft.buyAmount" class="input" required>
            <option value="">—</option>
            <option v-for="p in amountsForSelectedGame" :key="p.id" :value="p.amount">
              {{ p.name }} ({{ p.amount }})
            </option>
          </select>
          <input v-else v-model="draft.buyAmount" class="input" placeholder="Amount" required >
        </div>

        <div>
          <label class="label">{{ $t('customer.form.paidAmount') }} *</label>
          <input v-model="draft.paidAmount" type="number" step="0.01" class="input" required >
        </div>

        <div>
          <label class="label">{{ $t('customer.form.receipt') }}</label>
          <input v-model="draft.receiptUrl" class="input" placeholder="https://..." >
          <p class="mt-1 text-xs text-zinc-500">{{ $t('customer.form.receiptHelper') }}</p>
        </div>

        <button type="submit" class="btn-primary w-full" :disabled="submitting">
          {{ submitting ? $t('customer.form.submitting') : $t('customer.form.submit') }}
        </button>
      </form>
    </template>
  </div>
</template>
