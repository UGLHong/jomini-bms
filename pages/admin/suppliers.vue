<script setup lang="ts">
definePageMeta({ requiresAdmin: true })

type GameMeta = { splitStrategy?: 'greedy_largest_first' | 'fewest_splits' | 'min_cost' }
type SupplierGame = { gameKey: string; enabled: boolean; isDefault: boolean; metadata: GameMeta }
type ApiKind = 'none' | 'quinngamingshop'
type SupplierApiConfig = {
  kind: ApiKind
  baseUrl?: string
  autoSubmit?: boolean
  defaultContact?: string
}
type SupplierRow = {
  key: string
  name: string
  enabled: boolean
  relayChannel: string | null
  telegramGroupId: string | null
  telegramMentions: string[]
  notes: string | null
  apiConfig: SupplierApiConfig
  hasApiKey: boolean
  apiKey?: string
  games: SupplierGame[]
}
type GameRow = { key: string; name: string }

const { data: suppliersData, refresh } = await useFetch<{ suppliers: SupplierRow[] }>('/api/admin/suppliers')
const { data: gamesData } = await useFetch<{ games: GameRow[] }>('/api/admin/games')
const draft = ref<SupplierRow[]>([])
const message = ref('')
const saving = ref(false)

watchEffect(() => {
  draft.value = JSON.parse(JSON.stringify(suppliersData.value?.suppliers ?? []))
})

const availableGames = computed(() => gamesData.value?.games ?? [])

const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(suppliersData.value?.suppliers ?? []))

function handleAdd() {
  draft.value = [
    ...draft.value,
    {
      key: '',
      name: '',
      enabled: true,
      relayChannel: 'telegram',
      telegramGroupId: null,
      telegramMentions: [],
      notes: null,
      apiConfig: { kind: 'none' },
      hasApiKey: false,
      games: [],
    },
  ]
}

const balanceState = ref<Record<string, { loading: boolean; message: string }>>({})

async function handleCheckBalance(key: string) {
  balanceState.value[key] = { loading: true, message: '' }
  try {
    const res = await $fetch<{ ok: boolean; balance: number | null; message: string }>(
      `/api/admin/suppliers/${key}/balance`,
    )
    balanceState.value[key] = {
      loading: false,
      message: res.ok
        ? `Balance: ${res.balance?.toLocaleString() ?? 'n/a'}`
        : `Failed: ${res.message}`,
    }
  } catch (err) {
    balanceState.value[key] = {
      loading: false,
      message: err instanceof Error ? err.message : 'Failed',
    }
  }
}

function handleMentionsChange(supplier: SupplierRow, raw: string) {
  supplier.telegramMentions = raw
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

function toggleGame(supplier: SupplierRow, gameKey: string) {
  const existing = supplier.games.find((g) => g.gameKey === gameKey)
  if (existing) {
    supplier.games = supplier.games.filter((g) => g.gameKey !== gameKey)
  } else {
    supplier.games.push({ gameKey, enabled: true, isDefault: false, metadata: {} })
  }
}

async function handleSave() {
  saving.value = true
  message.value = ''
  try {
    await $fetch('/api/admin/suppliers', {
      method: 'PUT',
      body: { upsert: draft.value },
    })
    await refresh()
    message.value = 'Saved'
  } catch (err) {
    message.value = err instanceof Error ? err.message : 'Save failed'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-8">
    <AdminPageHeader title="Suppliers" subtitle="Suppliers and which games they support">
      <template #actions>
        <button class="btn-secondary" @click="handleAdd">+ Add supplier</button>
        <button class="btn-primary" :disabled="!dirty || saving" @click="handleSave">Save</button>
      </template>
    </AdminPageHeader>

    <p v-if="message" class="mb-4 text-sm text-zinc-600">{{ message }}</p>

    <div class="space-y-4">
      <div v-for="(supplier, i) in draft" :key="i" class="card space-y-3 p-4">
        <div class="grid gap-3 sm:grid-cols-3">
          <div>
            <label class="label">Key</label>
            <input v-model="supplier.key" class="input" :disabled="!!suppliersData?.suppliers?.find((s) => s.key === supplier.key)" >
          </div>
          <div>
            <label class="label">Name</label>
            <input v-model="supplier.name" class="input" >
          </div>
          <div>
            <label class="label">Relay channel</label>
            <select v-model="supplier.relayChannel" class="input">
              <option value="telegram">Telegram</option>
              <option value="none">None</option>
            </select>
          </div>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="label">Telegram group ID</label>
            <input v-model="supplier.telegramGroupId" class="input" placeholder="-1001234567890" >
          </div>
          <div>
            <label class="label">Telegram mentions (comma-separated)</label>
            <input
              class="input"
              :value="supplier.telegramMentions.join(', ')"
              @input="(e) => handleMentionsChange(supplier, (e.target as HTMLInputElement).value)"
            >
          </div>
        </div>
        <div>
          <label class="label">Notes</label>
          <textarea v-model="supplier.notes" class="input" rows="2" />
        </div>

        <SupplierApiConfigSection
          :supplier="supplier"
          :balance-state="balanceState[supplier.key]"
          @check-balance="handleCheckBalance"
        />
        <div>
          <label class="label">Games</label>
          <div class="flex flex-wrap gap-2">
            <label
              v-for="game in availableGames"
              :key="game.key"
              class="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700"
            >
              <input
                type="checkbox"
                :checked="!!supplier.games.find((g) => g.gameKey === game.key)"
                @change="toggleGame(supplier, game.key)"
              >
              {{ game.name }}
            </label>
          </div>
        </div>

        <div v-if="supplier.games.length > 0" class="rounded-md border border-zinc-200 p-3 dark:border-zinc-700">
          <h4 class="text-sm font-medium">Per-game options</h4>
          <div class="mt-2 space-y-2">
            <div v-for="g in supplier.games" :key="g.gameKey" class="grid grid-cols-5 items-center gap-2 text-sm">
              <span>{{ availableGames.find((a) => a.key === g.gameKey)?.name ?? g.gameKey }}</span>
              <label class="inline-flex items-center gap-1">
                <input v-model="g.enabled" type="checkbox" > enabled
              </label>
              <label class="inline-flex items-center gap-1">
                <input v-model="g.isDefault" type="checkbox" > default
              </label>
              <label class="col-span-2">
                <span class="mr-1 text-xs text-zinc-500">Split:</span>
                <select v-model="g.metadata.splitStrategy" class="input">
                  <option :value="undefined">(default)</option>
                  <option value="greedy_largest_first">greedy_largest_first</option>
                  <option value="fewest_splits">fewest_splits</option>
                  <option value="min_cost">min_cost</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        <label class="inline-flex items-center gap-2 text-sm">
          <input v-model="supplier.enabled" type="checkbox" > Enabled
        </label>
      </div>
    </div>
  </div>
</template>
