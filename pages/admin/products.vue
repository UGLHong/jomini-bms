<script setup lang="ts">
import { twMerge } from 'tailwind-merge'
import { buildProductJsonSchema } from '@/utils/productJsonSchema'
import {
  makeDraftFromProducts,
  parseTsvPaste,
  stringifyDraft,
  type ProductBulkDraft,
  type ProductDraft,
} from '@/utils/productBulkDraft'

definePageMeta({ requiresAdmin: true })

type GameRow = { key: string; name: string; enabled: boolean }
type SupplierRow = { key: string; name: string; enabled: boolean }
type ProductRow = ProductDraft & { id: string }

const { t } = useI18n()
const gameKey = ref('')
const supplierKey = ref('')
const view = ref<'table' | 'json'>('table')
const savingState = ref<'idle' | 'saving' | 'done' | 'error'>('idle')
const serverMessage = ref('')
const markerCount = ref(0)
const pasteBuffer = ref('')

const { data: gamesData } = await useFetch<{ games: GameRow[] }>('/api/admin/games')
const games = computed(() => (gamesData.value?.games ?? []).filter((g) => g.enabled))
const { data: suppliersData } = await useFetch<{ suppliers: SupplierRow[] }>('/api/admin/suppliers')
const suppliers = computed(() => (suppliersData.value?.suppliers ?? []).filter((s) => s.enabled))

watchEffect(() => {
  if (!gameKey.value && games.value.length > 0) gameKey.value = games.value[0]!.key
  if (!supplierKey.value && suppliers.value.length > 0) supplierKey.value = suppliers.value[0]!.key
})

const productsQuery = computed(() => ({
  game: gameKey.value,
  supplier: supplierKey.value,
}))

const { data: productsData, refresh: refreshProducts, pending } = await useFetch<{ products: ProductRow[] }>(
  '/api/admin/products',
  { query: productsQuery, watch: [gameKey, supplierKey] },
)

const products = computed<ProductRow[]>(() => productsData.value?.products ?? [])
const draft = ref<ProductBulkDraft>(makeDraftFromProducts(gameKey.value, supplierKey.value, []))
const jsonText = ref('{}')

watch(
  [products, gameKey, supplierKey],
  () => {
    draft.value = makeDraftFromProducts(gameKey.value, supplierKey.value, products.value)
    jsonText.value = stringifyDraft(draft.value)
  },
  { immediate: true },
)

const schema = computed(() => buildProductJsonSchema(gameKey.value, supplierKey.value))

const dirty = computed(() => jsonText.value !== stringifyDraft(draft.value))

function resetDraft() {
  draft.value = makeDraftFromProducts(gameKey.value, supplierKey.value, products.value)
  jsonText.value = stringifyDraft(draft.value)
  serverMessage.value = ''
  savingState.value = 'idle'
}

function handleValidate(markers: { severity: number }[]) {
  markerCount.value = markers.filter((m) => m.severity >= 8).length
}

async function handleSave() {
  if (markerCount.value > 0) return
  savingState.value = 'saving'
  serverMessage.value = ''
  try {
    const parsed = JSON.parse(jsonText.value) as ProductBulkDraft
    const res = await $fetch<{
      insertedCount: number
      updatedCount: number
      deletedCount: number
    }>('/api/admin/products/bulk', {
      method: 'PUT',
      body: parsed,
    })
    serverMessage.value = `Inserted ${res.insertedCount}, updated ${res.updatedCount}, deleted ${res.deletedCount}`
    await refreshProducts()
    savingState.value = 'done'
  } catch (err) {
    savingState.value = 'error'
    serverMessage.value = err instanceof Error ? err.message : 'Save failed'
  }
}

function handlePasteImport() {
  try {
    const rows = parseTsvPaste(pasteBuffer.value)
    const next: ProductBulkDraft = {
      scope: { gameKey: gameKey.value, supplierKey: supplierKey.value },
      mode: 'merge',
      products: rows.map((r) => ({
        ...r,
        gameKey: gameKey.value,
        supplierKey: supplierKey.value,
      })),
    }
    jsonText.value = stringifyDraft(next)
    pasteBuffer.value = ''
    view.value = 'json'
  } catch (err) {
    serverMessage.value = err instanceof Error ? err.message : 'Failed to parse paste'
  }
}

function handleRowUpdate(index: number, patch: Partial<ProductDraft>) {
  const current = JSON.parse(jsonText.value) as ProductBulkDraft
  const row = current.products[index]
  if (!row) return
  current.products[index] = { ...row, ...patch }
  jsonText.value = stringifyDraft(current)
}

function handleRowRemove(index: number) {
  const current = JSON.parse(jsonText.value) as ProductBulkDraft
  const target = current.products[index]
  if (!target) return
  if (target.id) {
    current.deleteIds = [...(current.deleteIds ?? []), target.id]
  }
  current.products.splice(index, 1)
  jsonText.value = stringifyDraft(current)
}

function handleRowAdd() {
  const current = JSON.parse(jsonText.value) as ProductBulkDraft
  current.products.push({
    gameKey: gameKey.value,
    supplierKey: supplierKey.value,
    name: '',
    amount: '',
    cost: '0',
    selling: '0',
    combination: '',
    isBaseAmount: true,
    status: 'active',
    sortOrder: 0,
  })
  jsonText.value = stringifyDraft(current)
}

const tableRows = computed(() => {
  try {
    const parsed = JSON.parse(jsonText.value) as ProductBulkDraft
    return parsed.products ?? []
  } catch {
    return []
  }
})
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8">
    <AdminPageHeader title="Products & Pricing" subtitle="Bulk edit per-supplier denominations">
      <template #actions>
        <button class="btn-secondary" :disabled="!dirty" @click="resetDraft">
          {{ t('common.cancel') }}
        </button>
        <button
          class="btn-primary"
          :disabled="!dirty || markerCount > 0 || savingState === 'saving'"
          @click="handleSave"
        >
          {{ t('admin.products.saveChanges') }}
        </button>
      </template>
    </AdminPageHeader>

    <div class="mb-4 grid gap-3 sm:grid-cols-3">
      <div>
        <label class="label">{{ t('admin.products.filterGame') }}</label>
        <select v-model="gameKey" class="input">
          <option v-for="g in games" :key="g.key" :value="g.key">{{ g.name }}</option>
        </select>
      </div>
      <div>
        <label class="label">{{ t('admin.products.filterSupplier') }}</label>
        <select v-model="supplierKey" class="input">
          <option v-for="s in suppliers" :key="s.key" :value="s.key">{{ s.name }}</option>
        </select>
      </div>
      <div class="flex items-end gap-2">
        <button
          type="button"
          :class="twMerge('btn-secondary flex-1', view === 'table' && 'bg-zinc-200 dark:bg-zinc-700')"
          @click="view = 'table'"
        >
          {{ t('admin.products.tableView') }}
        </button>
        <button
          type="button"
          :class="twMerge('btn-secondary flex-1', view === 'json' && 'bg-zinc-200 dark:bg-zinc-700')"
          @click="view = 'json'"
        >
          {{ t('admin.products.jsonView') }}
        </button>
      </div>
    </div>

    <div
      v-if="dirty || markerCount > 0 || serverMessage"
      class="mb-4 rounded-md border px-3 py-2 text-sm"
      :class="markerCount > 0 || savingState === 'error'
        ? 'border-red-300 bg-red-50 text-red-700 dark:bg-red-950/40'
        : 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40'"
    >
      <span v-if="markerCount > 0">
        {{ markerCount }} schema issue(s). Fix them before saving.
      </span>
      <span v-else-if="dirty">{{ t('admin.products.unsavedWarning') }}</span>
      <span v-if="serverMessage"> {{ serverMessage }}</span>
    </div>

    <div v-if="pending" class="rounded-md bg-zinc-100 p-4 text-sm text-zinc-500 dark:bg-zinc-900">
      {{ t('common.loading') }}
    </div>

    <ProductTableEditor
      v-else-if="view === 'table'"
      :rows="tableRows"
      @update="handleRowUpdate"
      @remove="handleRowRemove"
      @add="handleRowAdd"
    />

    <MonacoEditor
      v-else
      v-model="jsonText"
      :json-schema="schema"
      language="json"
      height="640px"
      @validate="handleValidate"
    />

    <details class="mt-6 rounded-md border border-zinc-200 p-4 text-sm dark:border-zinc-700">
      <summary class="cursor-pointer font-medium">Paste TSV / CSV</summary>
      <p class="mt-2 text-xs text-zinc-500">
        Columns: <code>name</code>, <code>amount</code>, <code>cost</code>, <code>selling</code>,
        optional <code>combination</code>, <code>sortOrder</code>.
      </p>
      <textarea
        v-model="pasteBuffer"
        class="input mt-2 font-mono"
        rows="5"
        placeholder="name\tamount\tcost\tselling"
      />
      <button class="btn-secondary mt-2" :disabled="!pasteBuffer.trim()" @click="handlePasteImport">
        Import into editor
      </button>
    </details>
  </div>
</template>
