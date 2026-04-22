<script setup lang="ts">
definePageMeta({
  middleware: () => navigateTo('/orders'),
})
</script>

<template>
  <div class="flex h-[50vh] items-center justify-center text-zinc-500">Redirecting...</div>
</template>
