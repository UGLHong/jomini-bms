<script setup lang="ts">
const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()

async function handleLogout() {
  await auth.logout()
  await router.push('/login')
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6 px-4 py-8">
    <h1 class="text-2xl font-semibold">{{ t('nav.account') }}</h1>

    <div v-if="auth.user" class="card space-y-3 p-6">
      <div class="flex items-center gap-3">
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary text-lg font-semibold text-white">
          {{ auth.user.displayName.charAt(0).toUpperCase() || auth.user.email.charAt(0).toUpperCase() }}
        </div>
        <div>
          <div class="font-medium">{{ auth.user.displayName || auth.user.email }}</div>
          <div class="text-sm text-zinc-500">{{ auth.user.email }}</div>
          <div class="text-xs uppercase tracking-wide text-zinc-400">{{ auth.user.role }}</div>
        </div>
      </div>

      <button class="btn-secondary" @click="handleLogout">
        {{ t('nav.logout') }}
      </button>
    </div>
  </div>
</template>
