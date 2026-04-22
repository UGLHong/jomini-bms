<script setup lang="ts">
import type { ProductDraft } from '@/utils/productBulkDraft'

defineProps<{
  rows: ProductDraft[]
}>()

const emit = defineEmits<{
  (e: 'update', index: number, patch: Partial<ProductDraft>): void
  (e: 'remove', index: number): void
  (e: 'add'): void
}>()

function handleCellInput(index: number, key: keyof ProductDraft, event: Event) {
  const target = event.target as HTMLInputElement
  const value = target.type === 'checkbox' ? target.checked : target.value
  emit('update', index, { [key]: value } as Partial<ProductDraft>)
}

function handleServiceIdInput(index: number, event: Event, row: ProductDraft) {
  const value = (event.target as HTMLInputElement).value
  const metadata = { ...(row.metadata ?? {}), supplierServiceId: value || undefined }
  emit('update', index, { metadata })
}

function getServiceId(row: ProductDraft): string {
  const v = (row.metadata ?? {})['supplierServiceId']
  return typeof v === 'string' ? v : ''
}
</script>

<template>
  <div class="overflow-x-auto rounded-md border border-zinc-200 dark:border-zinc-700">
    <table class="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-700">
      <thead class="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
        <tr>
          <th class="px-3 py-2">Name</th>
          <th class="px-3 py-2">Amount</th>
          <th class="px-3 py-2">Cost</th>
          <th class="px-3 py-2">Selling</th>
          <th class="px-3 py-2">Base</th>
          <th class="px-3 py-2">Combination</th>
          <th class="px-3 py-2">Supplier service ID</th>
          <th class="px-3 py-2">Status</th>
          <th class="px-3 py-2 text-right">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
        <tr v-for="(row, index) in rows" :key="row.id ?? index">
          <td class="px-3 py-2">
            <input :value="row.name" class="input" @input="(e) => handleCellInput(index, 'name', e)" >
          </td>
          <td class="px-3 py-2 w-28">
            <input :value="row.amount" class="input" @input="(e) => handleCellInput(index, 'amount', e)" >
          </td>
          <td class="px-3 py-2 w-28">
            <input :value="row.cost" type="number" step="0.0001" class="input" @input="(e) => handleCellInput(index, 'cost', e)" >
          </td>
          <td class="px-3 py-2 w-28">
            <input :value="row.selling" type="number" step="0.0001" class="input" @input="(e) => handleCellInput(index, 'selling', e)" >
          </td>
          <td class="px-3 py-2 w-10 text-center">
            <input :checked="row.isBaseAmount !== false" type="checkbox" @change="(e) => handleCellInput(index, 'isBaseAmount', e)" >
          </td>
          <td class="px-3 py-2 w-40">
            <input :value="row.combination ?? ''" class="input" @input="(e) => handleCellInput(index, 'combination', e)" >
          </td>
          <td class="px-3 py-2 w-36">
            <input
              :value="getServiceId(row)"
              class="input"
              placeholder="MLBB_ID_CP"
              @input="(e) => handleServiceIdInput(index, e, row)"
            >
          </td>
          <td class="px-3 py-2 w-32">
            <select :value="row.status ?? 'active'" class="input" @change="(e) => handleCellInput(index, 'status', e)">
              <option value="active">active</option>
              <option value="disabled">disabled</option>
            </select>
          </td>
          <td class="px-3 py-2 w-20 text-right">
            <button type="button" class="text-sm text-red-600 hover:underline" @click="emit('remove', index)">
              Remove
            </button>
          </td>
        </tr>
        <tr v-if="rows.length === 0">
          <td class="px-3 py-6 text-center text-zinc-400" colspan="9">No products yet. Add one below.</td>
        </tr>
      </tbody>
    </table>

    <div class="flex justify-end bg-zinc-50 px-3 py-2 dark:bg-zinc-900">
      <button class="btn-secondary" @click="emit('add')">+ Add row</button>
    </div>
  </div>
</template>
