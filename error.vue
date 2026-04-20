<script setup lang="ts">
const props = defineProps<{
  error: { statusCode?: number; statusMessage?: string; message?: string }
}>()

const router = useRouter()

function handleReturn() {
  clearError({ redirect: '/' })
}

function handleBack() {
  router.back()
}

const statusCode = computed(() => props.error?.statusCode ?? 500)
const title = computed(() => {
  if (statusCode.value === 404) return 'Page not found'
  if (statusCode.value === 401) return 'Not authorized'
  if (statusCode.value === 403) return 'Forbidden'
  return 'Something went wrong'
})
</script>

<template>
  <NuxtLayout name="public">
    <div class="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
      <p class="font-mono text-6xl font-semibold text-brand-primary">{{ statusCode }}</p>
      <h1 class="mt-4 text-xl font-semibold">{{ title }}</h1>
      <p v-if="error?.message" class="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{{ error.message }}</p>
      <div class="mt-6 flex gap-2">
        <button class="btn-secondary" @click="handleBack">Back</button>
        <button class="btn-primary" @click="handleReturn">Home</button>
      </div>
    </div>
  </NuxtLayout>
</template>
