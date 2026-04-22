<script setup lang="ts">
definePageMeta({ requiresAdmin: true })

type AnnouncementConfig = {
  title: string
  bodyMarkdown: string
  updatedAt?: string
}

const { data, refresh } = await useFetch<{ config: AnnouncementConfig | null }>('/api/admin/announcements')
const draft = ref<AnnouncementConfig>({ title: '', bodyMarkdown: '' })
const saving = ref(false)
const message = ref('')

watchEffect(() => {
  if (data.value?.config) draft.value = { ...data.value.config }
})

async function handleSave() {
  saving.value = true
  message.value = ''
  try {
    await $fetch('/api/admin/announcements', {
      method: 'PUT',
      body: {
        title: draft.value.title,
        bodyMarkdown: draft.value.bodyMarkdown,
      },
    })
    await refresh()
    message.value = 'Saved'
  } catch (err) {
    message.value = err instanceof Error ? err.message : 'Save failed'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-8">
    <AdminPageHeader title="Payment announcement" subtitle="Shown above the public customer order form" />
    <p v-if="message" class="mb-2 text-sm text-zinc-600">{{ message }}</p>
    <div class="card space-y-3 p-4">
      <div>
        <label class="label">Title</label>
        <input v-model="draft.title" class="input" >
      </div>
      <div>
        <label class="label">Body (Markdown)</label>
        <textarea v-model="draft.bodyMarkdown" class="input font-mono" rows="10" />
      </div>
      <button class="btn-primary" :disabled="saving" @click="handleSave">Save</button>
    </div>
  </div>
</template>
