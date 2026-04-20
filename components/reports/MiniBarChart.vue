<script setup lang="ts">
const props = defineProps<{
  data: Array<{ label: string; value: number }>
  height?: number
}>()

const maxValue = computed(() => {
  if (!props.data.length) return 0
  return Math.max(...props.data.map((d) => d.value), 1)
})
</script>

<template>
  <div class="flex h-full items-end gap-1 overflow-x-auto">
    <div v-for="item in data" :key="item.label" class="flex flex-1 min-w-[24px] flex-col items-center gap-1">
      <div
        class="w-full rounded-t bg-brand-primary/80 transition"
        :style="{ height: `${(item.value / maxValue) * (height ?? 120)}px` }"
        :title="`${item.label}: ${item.value}`"
      />
      <div class="whitespace-nowrap text-[10px] text-zinc-500">{{ item.label }}</div>
    </div>
  </div>
</template>
