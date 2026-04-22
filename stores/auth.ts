import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

type Role = 'admin' | 'operator'

export type SessionUser = {
  id: string
  email: string
  role: Role
  displayName: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<SessionUser | null>(null)
  const ready = ref(false)

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  async function fetchMe(): Promise<SessionUser | null> {
    try {
      const res = await $fetch<{ user: SessionUser }>('/api/auth/me', {
        credentials: 'include',
      })
      user.value = res.user
      return res.user
    } catch {
      try {
        const refreshed = await $fetch<{ user: SessionUser }>('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        })
        user.value = refreshed.user
        return refreshed.user
      } catch {
        user.value = null
        return null
      }
    } finally {
      ready.value = true
    }
  }

  async function login(email: string, password: string): Promise<SessionUser> {
    const res = await $fetch<{ user: SessionUser }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
      credentials: 'include',
    })
    user.value = res.user
    return res.user
  }

  async function logout(): Promise<void> {
    await $fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {})
    user.value = null
  }

  function reset() {
    user.value = null
    ready.value = false
  }

  return { user, ready, isAuthenticated, isAdmin, fetchMe, login, logout, reset }
})
