<script setup lang="ts">
type ApiKind = 'none' | 'quinngamingshop'
type ApiConfig = {
  kind: ApiKind
  baseUrl?: string
  autoSubmit?: boolean
  defaultContact?: string
}
type Supplier = {
  key: string
  apiConfig: ApiConfig
  hasApiKey: boolean
  apiKey?: string
}

defineProps<{
  supplier: Supplier
  balanceState?: { loading: boolean; message: string }
}>()

const emit = defineEmits<{
  (e: 'check-balance', key: string): void
}>()

function handleCheckBalance(key: string) {
  emit('check-balance', key)
}
</script>

<template>
  <div class="rounded-md border border-zinc-200 p-3 dark:border-zinc-700">
    <h4 class="text-sm font-medium">Supplier API integration</h4>
    <p class="mt-1 text-xs text-zinc-500">
      Auto-submits orders to the supplier API when an admin marks the order as processing.
    </p>

    <div class="mt-3 grid gap-3 sm:grid-cols-3">
      <div>
        <label class="label">API kind</label>
        <select v-model="supplier.apiConfig.kind" class="input">
          <option value="none">None (manual / Telegram relay)</option>
          <option value="quinngamingshop">quinngamingshop</option>
        </select>
      </div>
      <div>
        <label class="label">Base URL (optional)</label>
        <input
          v-model="supplier.apiConfig.baseUrl"
          class="input"
          placeholder="https://api.quinngamingshop.com"
        >
      </div>
      <div>
        <label class="label">Default contact (fallback phone)</label>
        <input v-model="supplier.apiConfig.defaultContact" class="input" placeholder="08xxxxxxxxx" >
      </div>
    </div>

    <div class="mt-3 grid gap-3 sm:grid-cols-3">
      <div class="sm:col-span-2">
        <label class="label">
          API key
          <span v-if="supplier.hasApiKey && supplier.apiKey === undefined" class="ml-2 text-xs text-emerald-600">
            (stored, leave blank to keep)
          </span>
        </label>
        <input
          v-model="supplier.apiKey"
          class="input"
          type="password"
          autocomplete="new-password"
          placeholder="paste API key to update, empty to keep, space to clear"
        >
      </div>
      <div class="flex items-end">
        <label class="inline-flex items-center gap-2 text-sm">
          <input
            :checked="supplier.apiConfig.autoSubmit !== false"
            type="checkbox"
            @change="(e) => (supplier.apiConfig.autoSubmit = (e.target as HTMLInputElement).checked)"
          >
          Auto-submit on process
        </label>
      </div>
    </div>

    <div v-if="supplier.apiConfig.kind !== 'none' && supplier.hasApiKey" class="mt-3 flex items-center gap-3 text-sm">
      <button type="button" class="btn-secondary" @click="handleCheckBalance(supplier.key)">
        {{ balanceState?.loading ? 'Checking…' : 'Check balance' }}
      </button>
      <span class="text-zinc-600 dark:text-zinc-300">{{ balanceState?.message }}</span>
    </div>
  </div>
</template>
