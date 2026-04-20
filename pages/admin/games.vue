<script setup lang="ts">
import { stringifyDraft } from '@/utils/productBulkDraft'

definePageMeta({ requiresAdmin: true })

type GameRow = {
  key: string
  name: string
  enabled: boolean
  iconUrl: string | null
  currencyLabel: string
  sortOrder: number
  gameIdFormat: Record<string, unknown>
}

const { data, refresh, pending } = await useFetch<{ games: GameRow[] }>('/api/admin/games')
const draft = ref<GameRow[]>([])
const message = ref('')
const saving = ref(false)

watchEffect(() => {
  draft.value = JSON.parse(JSON.stringify(data.value?.games ?? []))
})

const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(data.value?.games ?? []))

function handleAdd() {
  draft.value = [
    ...draft.value,
    {
      key: '',
      name: '',
      enabled: true,
      iconUrl: null,
      currencyLabel: 'Diamonds',
      sortOrder: draft.value.length * 10,
      gameIdFormat: {},
    },
  ]
}

async function handleSave() {
  saving.value = true
  message.value = ''
  try {
    await $fetch('/api/admin/games', {
      method: 'PUT',
      body: {
        upsert: draft.value.map((g) => ({
          ...g,
          iconUrl: g.iconUrl || null,
          gameIdFormat: g.gameIdFormat ?? {},
        })),
      },
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
    <AdminPageHeader title="Games" subtitle="Enable / disable games and define their game ID format">
      <template #actions>
        <button class="btn-secondary" @click="handleAdd">+ Add game</button>
        <button class="btn-primary" :disabled="!dirty || saving" @click="handleSave">Save</button>
      </template>
    </AdminPageHeader>

    <p v-if="message" class="mb-4 text-sm text-zinc-600">{{ message }}</p>
    <div v-if="pending" class="text-sm text-zinc-500">Loading...</div>

    <div class="space-y-4">
      <div v-for="(game, i) in draft" :key="i" class="card space-y-3 p-4">
        <div class="grid gap-3 sm:grid-cols-4">
          <div>
            <label class="label">Key</label>
            <input v-model="game.key" class="input" :disabled="!!data?.games?.find((g) => g.key === game.key)" />
          </div>
          <div>
            <label class="label">Name</label>
            <input v-model="game.name" class="input" />
          </div>
          <div>
            <label class="label">Currency label</label>
            <input v-model="game.currencyLabel" class="input" />
          </div>
          <div>
            <label class="label">Sort order</label>
            <input v-model.number="game.sortOrder" type="number" class="input" />
          </div>
        </div>
        <div class="flex items-center gap-4">
          <label class="inline-flex items-center gap-2 text-sm">
            <input v-model="game.enabled" type="checkbox" /> Enabled
          </label>
          <div class="flex-1">
            <label class="label">Icon URL</label>
            <input v-model="game.iconUrl" class="input" type="url" placeholder="https://..." />
          </div>
        </div>
        <details>
          <summary class="cursor-pointer text-sm font-medium">Game ID format JSON</summary>
          <textarea
            class="input mt-2 font-mono text-xs"
            rows="4"
            :value="stringifyDraft({ scope: { gameKey: game.key, supplierKey: '' }, mode: 'merge', products: [] }).length > 0 ? JSON.stringify(game.gameIdFormat, null, 2) : '{}'"
            @input="(e) => {
              try {
                game.gameIdFormat = JSON.parse((e.target as HTMLTextAreaElement).value)
              } catch (err) {
                // invalid json, keep user's text
              }
            }"
          />
        </details>
      </div>
    </div>
  </div>
</template>
