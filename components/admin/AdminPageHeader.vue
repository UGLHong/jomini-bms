<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <div class="mb-6 flex items-start justify-between gap-4">
    <div>
      <NuxtLink to="/admin" class="mb-2 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-brand-primary">
        ← Admin
      </NuxtLink>
      <h1 class="text-2xl font-semibold">{{ title }}</h1>
      <p v-if="subtitle" class="text-sm text-zinc-500">{{ subtitle }}</p>
    </div>
    <slot name="actions" />
  </div>
</template>
