<script setup lang="ts">
definePageMeta({
  requiresAdmin: true,
})

const { t } = useI18n()

const sections = computed(() => [
  { key: 'games', to: '/admin/games', icon: '🎮', desc: 'Enable / disable games, set ID format' },
  { key: 'suppliers', to: '/admin/suppliers', icon: '🤝', desc: 'Manage suppliers and which games they cover' },
  { key: 'products', to: '/admin/products', icon: '💎', desc: 'Bulk edit denomination pricing via Monaco JSON' },
  { key: 'stock', to: '/admin/stock', icon: '📦', desc: 'Update per-game stock and restock schedule' },
  { key: 'announcements', to: '/admin/announcements', icon: '📣', desc: 'Payment instruction banner for the public form' },
  { key: 'externalUrls', to: '/admin/external-urls', icon: '🔗', desc: 'Generate one-time external order URLs' },
  { key: 'manualOrder', to: '/admin/manual-order', icon: '📝', desc: 'Punch in an order manually' },
  { key: 'users', to: '/admin/users', icon: '👥', desc: 'Invite teammates and manage roles' },
])
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-8">
    <h1 class="mb-6 text-2xl font-semibold">{{ t('admin.title') }}</h1>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="section in sections"
        :key="section.key"
        :to="section.to"
        class="card flex items-start gap-3 p-5 transition hover:border-brand-primary hover:shadow-md"
      >
        <div class="text-2xl">{{ section.icon }}</div>
        <div>
          <div class="font-medium">{{ t(`admin.sections.${section.key}`) }}</div>
          <div class="text-sm text-zinc-500">{{ section.desc }}</div>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
