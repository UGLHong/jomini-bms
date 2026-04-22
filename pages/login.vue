<script setup lang="ts">
definePageMeta({
  layout: 'auth',
})

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const submitting = ref(false)
const error = ref('')

async function handleSubmit(event: Event) {
  event.preventDefault()
  if (submitting.value) return

  submitting.value = true
  error.value = ''
  try {
    await auth.login(email.value.trim(), password.value)
    const nextPath = typeof route.query.next === 'string' ? route.query.next : '/orders'
    await router.push(nextPath)
  } catch (err: unknown) {
    error.value = err instanceof Error && 'statusCode' in err && err.statusCode === 401
      ? t('auth.invalidCredentials')
      : t('auth.invalidCredentials')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <form class="card space-y-5 p-8" @submit="handleSubmit">
    <div class="space-y-1 text-center">
      <img src="/logo.svg" alt="Jomini" class="mx-auto h-12 w-12" >
      <h1 class="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Jomini BMS
      </h1>
      <p class="text-sm text-zinc-500">{{ t('auth.login') }}</p>
    </div>

    <div>
      <label class="label" for="email">{{ t('auth.email') }}</label>
      <input
        id="email"
        v-model="email"
        type="email"
        autocomplete="email"
        required
        class="input"
      >
    </div>

    <div>
      <label class="label" for="password">{{ t('auth.password') }}</label>
      <input
        id="password"
        v-model="password"
        type="password"
        autocomplete="current-password"
        required
        class="input"
      >
    </div>

    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

    <button
      type="submit"
      :disabled="submitting"
      class="btn-primary w-full"
    >
      {{ submitting ? t('auth.signingIn') : t('auth.signIn') }}
    </button>
  </form>
</template>
