<script setup lang="ts">
definePageMeta({ requiresAdmin: true })

type UserRow = {
  id: string
  email: string
  displayName: string
  role: 'admin' | 'operator'
  status: 'invited' | 'active' | 'disabled'
  lastLoginAt: string | null
  inviteExpiresAt: string | null
}

const { t } = useI18n()
const { data, refresh } = await useFetch<{ users: UserRow[] }>('/api/admin/users')

const inviteEmail = ref('')
const inviteName = ref('')
const inviteRole = ref<'admin' | 'operator'>('operator')
const inviteLink = ref('')
const submitting = ref(false)
const error = ref('')

async function handleInvite() {
  submitting.value = true
  error.value = ''
  try {
    const res = await $fetch<{ inviteToken: string; email: string; expiresAt: string }>(
      '/api/admin/users',
      {
        method: 'POST',
        body: {
          email: inviteEmail.value.trim(),
          displayName: inviteName.value.trim(),
          role: inviteRole.value,
        },
      },
    )
    const appUrl = window.location.origin
    inviteLink.value = `${appUrl}/accept-invite?token=${res.inviteToken}`
    await refresh()
    inviteEmail.value = ''
    inviteName.value = ''
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Could not invite'
  } finally {
    submitting.value = false
  }
}

async function handleStatus(user: UserRow, status: 'active' | 'disabled') {
  await $fetch(`/api/admin/users/${user.id}`, { method: 'PATCH', body: { status } })
  await refresh()
}

function copyToClipboard(text: string) {
  navigator.clipboard?.writeText(text).catch(() => {})
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-8">
    <AdminPageHeader title="Users" subtitle="Invite teammates and manage access" />

    <div class="card mb-6 space-y-3 p-4">
      <h2 class="font-medium">{{ t('admin.users.invite') }}</h2>
      <div class="grid gap-3 sm:grid-cols-3">
        <input v-model="inviteEmail" type="email" class="input" placeholder="email@company.com" >
        <input v-model="inviteName" class="input" placeholder="Display name (optional)" >
        <select v-model="inviteRole" class="input">
          <option value="operator">operator</option>
          <option value="admin">admin</option>
        </select>
      </div>
      <button class="btn-primary" :disabled="submitting || !inviteEmail" @click="handleInvite">
        {{ submitting ? 'Inviting…' : t('admin.users.invite') }}
      </button>
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <div v-if="inviteLink" class="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm dark:bg-emerald-950/40">
        <div class="mb-1 font-medium">Invite link (share securely):</div>
        <div class="break-all font-mono text-xs">{{ inviteLink }}</div>
        <button class="btn-ghost mt-1 text-xs" @click="copyToClipboard(inviteLink)">{{ t('admin.users.copyLink') }}</button>
      </div>
    </div>

    <div class="card overflow-x-auto">
      <table class="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-700">
        <thead class="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
          <tr>
            <th class="px-3 py-2 text-left">Email</th>
            <th class="px-3 py-2 text-left">Name</th>
            <th class="px-3 py-2 text-left">Role</th>
            <th class="px-3 py-2 text-left">Status</th>
            <th class="px-3 py-2 text-left">Last login</th>
            <th class="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
          <tr v-for="user in data?.users ?? []" :key="user.id">
            <td class="px-3 py-2">{{ user.email }}</td>
            <td class="px-3 py-2">{{ user.displayName || '—' }}</td>
            <td class="px-3 py-2">{{ user.role }}</td>
            <td class="px-3 py-2">
              <span class="rounded-md bg-zinc-100 px-2 py-0.5 text-xs uppercase dark:bg-zinc-800">
                {{ user.status }}
              </span>
            </td>
            <td class="px-3 py-2 text-xs text-zinc-500">
              {{ user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '—' }}
            </td>
            <td class="px-3 py-2 text-right">
              <button
                v-if="user.status !== 'disabled'"
                class="text-red-600 hover:underline"
                @click="handleStatus(user, 'disabled')"
              >
                Disable
              </button>
              <button
                v-else
                class="text-emerald-600 hover:underline"
                @click="handleStatus(user, 'active')"
              >
                Reactivate
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
