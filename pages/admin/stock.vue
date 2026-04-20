<script setup lang="ts">
definePageMeta({ requiresAdmin: true })

type StockRow = {
  gameKey: string
  remainingStock: string
  outOfStockThreshold: number
  stockAvailable: boolean
  restockAt: string | null
  custom: Record<string, unknown>
}

const { data, refresh } = await useFetch<{ stock: StockRow[] }>('/api/admin/stock')
const saving = ref<string | null>(null)
const message = ref('')

async function handleSave(row: StockRow) {
  saving.value = row.gameKey
  message.value = ''
  try {
    await $fetch('/api/stock-status', {
      method: 'PUT',
      body: {
        game: row.gameKey,
        remainingStock: Number.parseFloat(row.remainingStock) || 0,
        outOfStockThreshold: row.outOfStockThreshold,
        stockAvailable: row.stockAvailable,
        restockAt: row.restockAt || null,
        custom: row.custom,
      },
    })
    await refresh()
    message.value = `Updated ${row.gameKey}`
  } catch (err) {
    message.value = err instanceof Error ? err.message : 'Save failed'
  } finally {
    saving.value = null
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8">
    <AdminPageHeader title="Stock" subtitle="Per-game stock status consumed by FlowXO" />

    <p v-if="message" class="mb-4 text-sm text-zinc-600">{{ message }}</p>

    <div class="space-y-3">
      <div v-for="row in data?.stock ?? []" :key="row.gameKey" class="card p-4">
        <div class="mb-3 flex items-center justify-between">
          <span class="font-medium">{{ row.gameKey }}</span>
          <button
            class="btn-primary"
            :disabled="saving === row.gameKey"
            @click="handleSave(row)"
          >
            {{ saving === row.gameKey ? 'Saving…' : 'Save' }}
          </button>
        </div>

        <div class="grid gap-3 sm:grid-cols-4">
          <div>
            <label class="label">Remaining stock</label>
            <input v-model="row.remainingStock" type="number" step="0.01" class="input" />
          </div>
          <div>
            <label class="label">Out-of-stock threshold</label>
            <input v-model.number="row.outOfStockThreshold" type="number" class="input" />
          </div>
          <div>
            <label class="label">Restock at</label>
            <input
              :value="row.restockAt ? row.restockAt.slice(0, 16) : ''"
              type="datetime-local"
              class="input"
              @input="(e) => {
                const value = (e.target as HTMLInputElement).value
                row.restockAt = value ? new Date(value).toISOString() : null
              }"
            />
          </div>
          <div class="flex items-end gap-2">
            <label class="inline-flex items-center gap-2 text-sm">
              <input v-model="row.stockAvailable" type="checkbox" /> Stock available
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
