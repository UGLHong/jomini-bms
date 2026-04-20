<script setup lang="ts">
import type { ExternalLinkRow } from '@/server/db/schema'
import { formatDateTime } from '@/utils/formatDate'

definePageMeta({ requiresAuth: true })

const { data, refresh } = await useFetch<{ links: ExternalLinkRow[] }>('/api/external-links')

const draft = ref({
  userId: '',
  responsePath: '',
  expiresInHours: 24,
})
const creating = ref(false)

async function handleCreate() {
  creating.value = true
  try {
    await $fetch('/api/external-links', {
      method: 'POST',
      body: {
        userId: draft.value.userId || undefined,
        responsePath: draft.value.responsePath || undefined,
        expiresInHours: draft.value.expiresInHours,
      },
    })
    draft.value = { userId: '', responsePath: '', expiresInHours: 24 }
    await refresh()
  } finally {
    creating.value = false
  }
}

function buildLink(externalId: string) {
  if (typeof window === 'undefined') return `/external-order/${externalId}`
  return `${window.location.origin}/external-order/${externalId}`
}

async function handleCopy(externalId: string) {
  await navigator.clipboard.writeText(buildLink(externalId))
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-8">
    <AdminPageHeader title="External URLs" subtitle="Generate single-use links for customers" />

    <section class="card mb-6 p-4">
      <h2 class="mb-3 text-lg font-semibold">Generate new link</h2>
      <div class="grid grid-cols-1 gap-3 md:grid-cols-4">
        <input v-model="draft.userId" class="input" placeholder="User ID (optional)" />
        <input v-model="draft.responsePath" class="input" placeholder="Response path (optional)" />
        <input
          v-model.number="draft.expiresInHours"
          type="number"
          min="1"
          max="720"
          class="input"
          placeholder="Expires (hours)"
        />
        <button class="btn-primary" :disabled="creating" @click="handleCreate">Create link</button>
      </div>
    </section>

    <section class="card overflow-hidden">
      <table class="min-w-full text-sm">
        <thead class="bg-zinc-50 text-left dark:bg-zinc-900">
          <tr>
            <th class="px-3 py-2">External ID</th>
            <th class="px-3 py-2">Created</th>
            <th class="px-3 py-2">Expires</th>
            <th class="px-3 py-2">Consumed</th>
            <th class="px-3 py-2">Order</th>
            <th class="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800">
          <tr v-for="l in data?.links ?? []" :key="l.id">
            <td class="px-3 py-2 font-mono text-xs">{{ l.externalId }}</td>
            <td class="px-3 py-2">{{ formatDateTime(l.createdAt) }}</td>
            <td class="px-3 py-2">{{ formatDateTime(l.expiresAt) }}</td>
            <td class="px-3 py-2">{{ l.consumedAt ? formatDateTime(l.consumedAt) : '—' }}</td>
            <td class="px-3 py-2">{{ l.orderId || '—' }}</td>
            <td class="px-3 py-2">
              <button class="btn-ghost" @click="handleCopy(l.externalId)">Copy link</button>
            </td>
          </tr>
          <tr v-if="(data?.links?.length ?? 0) === 0">
            <td colspan="6" class="px-3 py-6 text-center text-zinc-500">No links yet</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>
