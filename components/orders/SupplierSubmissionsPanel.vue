<script setup lang="ts">
import { formatDateTime } from '@/utils/formatDate'

type Attempt = {
  at: string
  kind: 'submit' | 'status'
  ok: boolean
  message?: string
}

type Submission = {
  id: string
  idtrx: string
  serviceId: string
  target: string
  contact: string
  externalInvoice: string | null
  status: string
  attempts: Attempt[]
  lastCheckedAt: string | null
  createdAt: string
  updatedAt: string
}

defineProps<{
  submissions: Submission[]
  canResubmit: boolean
  busy: boolean
}>()

const emit = defineEmits<{
  (e: 'resubmit'): void
}>()

const statusClasses: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  processing: 'bg-blue-100 text-blue-800',
  success: 'bg-emerald-100 text-emerald-800',
  cancel: 'bg-zinc-200 text-zinc-700',
  refund: 'bg-purple-100 text-purple-800',
  error: 'bg-red-100 text-red-800',
}

function handleResubmit() {
  emit('resubmit')
}
</script>

<template>
  <section class="card p-4">
    <div class="mb-3 flex items-center justify-between">
      <h2 class="text-lg font-semibold">Supplier API submissions</h2>
      <button
        v-if="canResubmit"
        class="btn-secondary text-sm"
        :disabled="busy"
        @click="handleResubmit"
      >
        Resubmit to supplier
      </button>
    </div>

    <div v-if="submissions.length === 0" class="text-sm text-zinc-500">
      No submissions yet.
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="sub in submissions"
        :key="sub.id"
        class="rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-700"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="font-mono text-xs text-zinc-500">{{ sub.idtrx }}</div>
          <span
            class="rounded-full px-2 py-0.5 text-xs font-medium"
            :class="statusClasses[sub.status] ?? 'bg-zinc-100 text-zinc-700'"
          >
            {{ sub.status }}
          </span>
        </div>
        <dl class="mt-2 grid grid-cols-2 gap-1 text-xs md:grid-cols-4">
          <div>
            <dt class="text-zinc-500">Service ID</dt>
            <dd class="font-mono">{{ sub.serviceId || '—' }}</dd>
          </div>
          <div>
            <dt class="text-zinc-500">Target</dt>
            <dd class="font-mono">{{ sub.target }}</dd>
          </div>
          <div>
            <dt class="text-zinc-500">Invoice</dt>
            <dd class="font-mono">{{ sub.externalInvoice || '—' }}</dd>
          </div>
          <div>
            <dt class="text-zinc-500">Last checked</dt>
            <dd>{{ sub.lastCheckedAt ? formatDateTime(sub.lastCheckedAt) : '—' }}</dd>
          </div>
        </dl>
        <details v-if="sub.attempts.length" class="mt-2">
          <summary class="cursor-pointer text-xs text-zinc-500">Attempts ({{ sub.attempts.length }})</summary>
          <ul class="mt-1 space-y-1 text-xs">
            <li v-for="(attempt, i) in sub.attempts" :key="i" class="flex gap-2">
              <span :class="attempt.ok ? 'text-emerald-600' : 'text-red-600'">
                {{ attempt.ok ? 'OK' : 'FAIL' }}
              </span>
              <span class="text-zinc-500">{{ attempt.kind }}</span>
              <span class="text-zinc-500">{{ formatDateTime(attempt.at) }}</span>
              <span>{{ attempt.message ?? '' }}</span>
            </li>
          </ul>
        </details>
      </div>
    </div>
  </section>
</template>
