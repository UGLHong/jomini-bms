<script setup lang="ts">
definePageMeta({
  layout: 'auth',
})

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))

type InviteInfo = { email: string; displayName: string; role: 'admin' | 'operator' }
const invite = ref<InviteInfo | null>(null)
const loadError = ref('')
const displayName = ref('')
const password = ref('')
const password2 = ref('')
const submitting = ref(false)
const error = ref('')

onMounted(async () => {
  if (!token.value) {
    loadError.value = 'Invite token missing'
    return
  }
  try {
    const res = await $fetch<{ invite: InviteInfo }>('/api/auth/invite-lookup', {
      query: { token: token.value },
    })
    invite.value = res.invite
    displayName.value = res.invite.displayName || res.invite.email.split('@')[0] || ''
  } catch {
    loadError.value = 'Invite is invalid or expired'
  }
})

async function handleSubmit(event: Event) {
  event.preventDefault()
  if (submitting.value) return
  if (password.value.length < 10) {
    error.value = t('auth.passwordMinLength')
    return
  }
  if (password.value !== password2.value) {
    error.value = 'Passwords do not match'
    return
  }

  submitting.value = true
  error.value = ''
  try {
    await $fetch('/api/auth/accept-invite', {
      method: 'POST',
      body: {
        token: token.value,
        password: password.value,
        displayName: displayName.value.trim(),
      },
    })
    await auth.fetchMe()
    await router.push('/orders')
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Could not accept invite'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="card space-y-5 p-8">
    <div class="text-center">
      <h1 class="text-xl font-semibold">{{ t('auth.setPassword') }}</h1>
    </div>

    <p v-if="loadError" class="text-sm text-red-600">{{ loadError }}</p>

    <template v-if="invite">
      <div class="rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
        {{ invite.email }}
      </div>

      <form class="space-y-4" @submit="handleSubmit">
        <div>
          <label class="label" for="display-name">Display name</label>
          <input id="display-name" v-model="displayName" type="text" class="input" required />
        </div>

        <div>
          <label class="label" for="new-password">{{ t('auth.password') }}</label>
          <input id="new-password" v-model="password" type="password" autocomplete="new-password" class="input" required />
          <p class="mt-1 text-xs text-zinc-500">{{ t('auth.passwordMinLength') }}</p>
        </div>

        <div>
          <label class="label" for="confirm-password">Confirm password</label>
          <input id="confirm-password" v-model="password2" type="password" autocomplete="new-password" class="input" required />
        </div>

        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

        <button type="submit" :disabled="submitting" class="btn-primary w-full">
          {{ submitting ? t('common.loading') : t('common.submit') }}
        </button>
      </form>
    </template>
  </div>
</template>
