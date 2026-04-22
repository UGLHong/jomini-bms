<script setup lang="ts">
const { t, locale, locales, setLocale } = useI18n()
const { effective: isDark, toggle: toggleDark } = useDarkMode()
const auth = useAuthStore()

const navItems = computed(() => {
  const items = [
    { to: '/orders', labelKey: 'nav.orders' },
    { to: '/reports', labelKey: 'nav.reports' },
  ]
  if (auth.isAdmin) items.push({ to: '/admin', labelKey: 'nav.admin' })
  return items
})

const availableLocales = computed(() =>
  (locales.value as Array<{ code: string; name: string }>).filter((l) => l.code !== locale.value),
)

async function handleLocaleChange(code: string) {
  await setLocale(code as 'en' | 'ms')
}
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
    <div class="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
      <NuxtLink to="/" class="flex items-center gap-2 font-semibold text-brand-primary">
        <img src="/logo.svg" alt="Jomini" class="h-7 w-7" >
        <span class="hidden sm:inline">Jomini BMS</span>
      </NuxtLink>

      <nav class="flex items-center gap-1 text-sm">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="rounded-md px-3 py-1.5 text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          active-class="bg-zinc-100 font-medium text-brand-primary dark:bg-zinc-800"
        >
          {{ t(item.labelKey) }}
        </NuxtLink>
        <NuxtLink
          to="/account"
          class="rounded-md px-3 py-1.5 text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          active-class="bg-zinc-100 font-medium text-brand-primary dark:bg-zinc-800"
        >
          {{ t('nav.account') }}
        </NuxtLink>

        <button
          class="rounded-md px-2.5 py-1.5 text-xs uppercase text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          :aria-label="'Toggle language'"
          @click="handleLocaleChange(availableLocales[0]?.code ?? 'en')"
        >
          {{ locale === 'en' ? 'EN' : 'BM' }}
        </button>

        <button
          class="rounded-md px-2.5 py-1.5 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          @click="toggleDark"
        >
          <span v-if="isDark" aria-hidden="true">☀</span>
          <span v-else aria-hidden="true">☾</span>
        </button>
      </nav>
    </div>
  </header>
</template>
