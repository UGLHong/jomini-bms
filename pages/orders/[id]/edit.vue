<script setup lang="ts">
import type { OrderRow } from '@/server/db/schema'

definePageMeta({ requiresAuth: true })

const route = useRoute()
const router = useRouter()
const orderId = computed(() => String(route.params.id))

const { data } = await useFetch<{ order: OrderRow }>(() => `/api/orders/${orderId.value}`)
const order = ref<Partial<OrderRow>>({ ...(data.value?.order ?? {}) })
const saving = ref(false)
const errorMsg = ref('')

async function handleSave() {
  saving.value = true
  errorMsg.value = ''
  try {
    await $fetch(`/api/orders/${orderId.value}`, {
      method: 'PATCH',
      body: {
        fullname: order.value.fullname,
        gender: order.value.gender,
        phone: order.value.phone,
        email: order.value.email || undefined,
        gameId: order.value.gameId,
        ign: order.value.ign,
        buyAmount: order.value.buyAmount,
        paidAmount: order.value.paidAmount,
        costPrice: order.value.costPrice,
        receiptUrl: order.value.receiptUrl,
        remark: order.value.remark,
        supplierKey: order.value.supplierKey,
        amountCombinationString: order.value.amountCombinationString,
        language: order.value.language,
      },
    })
    router.push(`/orders/${orderId.value}`)
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Save failed'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-6">
    <AdminPageHeader title="Edit order" :subtitle="orderId" />
    <p v-if="errorMsg" class="mb-3 text-sm text-red-600">{{ errorMsg }}</p>

    <div v-if="!data?.order" class="py-8 text-center text-sm text-zinc-500">Loading...</div>
    <form v-else class="card space-y-3 p-4" @submit.prevent="handleSave">
      <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label class="label">Full name</label>
          <input v-model="order.fullname" class="input" >
        </div>
        <div>
          <label class="label">Phone</label>
          <input v-model="order.phone" class="input" >
        </div>
        <div>
          <label class="label">Game ID</label>
          <input v-model="order.gameId" class="input" >
        </div>
        <div>
          <label class="label">IGN</label>
          <input v-model="order.ign" class="input" >
        </div>
        <div>
          <label class="label">Buy amount</label>
          <input v-model="order.buyAmount" class="input" >
        </div>
        <div>
          <label class="label">Paid amount</label>
          <input v-model="order.paidAmount" class="input" >
        </div>
        <div>
          <label class="label">Cost price</label>
          <input v-model="order.costPrice" class="input" >
        </div>
        <div>
          <label class="label">Supplier</label>
          <input v-model="order.supplierKey" class="input" >
        </div>
        <div class="md:col-span-2">
          <label class="label">Combination</label>
          <input v-model="order.amountCombinationString" class="input" >
        </div>
        <div class="md:col-span-2">
          <label class="label">Remark</label>
          <textarea v-model="order.remark" class="input" rows="3" />
        </div>
      </div>
      <div class="flex gap-2">
        <button type="submit" class="btn-primary" :disabled="saving">Save</button>
        <button type="button" class="btn-ghost" @click="router.back()">Cancel</button>
      </div>
    </form>
  </div>
</template>
