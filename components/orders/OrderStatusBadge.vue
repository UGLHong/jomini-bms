<script setup lang="ts">
import { twMerge } from 'tailwind-merge'
import type { ProcessStatus } from '@/server/db/schema'

const props = defineProps<{ status: ProcessStatus }>()
const { t } = useI18n()

const statusClassMap: Record<ProcessStatus, string> = {
  open: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  processing: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  done: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  error: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
  closed: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  refund: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
}

const badgeClass = computed(() =>
  twMerge('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', statusClassMap[props.status]),
)
</script>

<template>
  <span :class="badgeClass">{{ t(`orders.statusBadge.${status}`) }}</span>
</template>
