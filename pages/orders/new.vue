<script setup lang="ts">
import type { OrderRow } from '@/server/db/schema'

definePageMeta({ requiresAuth: true })

const router = useRouter()
const { data: gamesData } = await useFetch<{ games: { key: string; name: string; enabled: boolean }[] }>('/api/admin/games')
const { data: suppliersData } = await useFetch<{ suppliers: { key: string; name: string; enabled: boolean }[] }>('/api/admin/suppliers')

const draft = ref({
  fullname: '',
  phone: '',
  email: '',
  gameKey: '',
  gameId: '',
  buyAmount: '',
  paidAmount: '',
  supplierKey: '',
  receiptUrl: '',
  remark: '',
  language: 'Bahasa Melayu',
})

const saving = ref(false)
const errorMsg = ref('')

async function handleSubmit() {
  saving.value = true
  errorMsg.value = ''
  try {
    const res = await $fetch<{ order: OrderRow }>('/api/orders', {
      method: 'POST',
      body: {
        ...draft.value,
        supplierKey: draft.value.supplierKey || undefined,
      },
    })
    router.push(`/orders/${res.order.id}`)
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Failed to create order'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-6">
    <AdminPageHeader title="Create manual order" subtitle="Manually enter an order on behalf of a customer" />

    <p v-if="errorMsg" class="mb-3 text-sm text-red-600">{{ errorMsg }}</p>

    <form class="card space-y-3 p-4" @submit.prevent="handleSubmit">
      <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label class="label">Full name *</label>
          <input v-model="draft.fullname" class="input" required >
        </div>
        <div>
          <label class="label">Phone</label>
          <input v-model="draft.phone" class="input" >
        </div>
        <div>
          <label class="label">Email</label>
          <input v-model="draft.email" type="email" class="input" >
        </div>
        <div>
          <label class="label">Game *</label>
          <select v-model="draft.gameKey" class="input" required>
            <option value="">Select a game</option>
            <option v-for="g in gamesData?.games?.filter((x) => x.enabled) ?? []" :key="g.key" :value="g.key">
              {{ g.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="label">Supplier (optional)</label>
          <select v-model="draft.supplierKey" class="input">
            <option value="">Default</option>
            <option v-for="s in suppliersData?.suppliers?.filter((x) => x.enabled) ?? []" :key="s.key" :value="s.key">
              {{ s.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="label">Game ID *</label>
          <input v-model="draft.gameId" class="input" required >
        </div>
        <div>
          <label class="label">Buy amount *</label>
          <input v-model="draft.buyAmount" class="input" required >
        </div>
        <div>
          <label class="label">Paid amount (RM) *</label>
          <input v-model="draft.paidAmount" class="input" required >
        </div>
        <div class="md:col-span-2">
          <label class="label">Receipt URL</label>
          <input v-model="draft.receiptUrl" class="input" placeholder="https://..." >
        </div>
        <div class="md:col-span-2">
          <label class="label">Remark</label>
          <textarea v-model="draft.remark" class="input" rows="3" />
        </div>
      </div>

      <div class="flex gap-2">
        <button type="submit" class="btn-primary" :disabled="saving">Create order</button>
        <button type="button" class="btn-ghost" @click="router.back()">Cancel</button>
      </div>
    </form>
  </div>
</template>
