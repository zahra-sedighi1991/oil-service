<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'admin'] })
useHead({ title: 'بررسی پیشنهادها' })
const api = useApi()
const toast = useToast()
const { dateTime, errorMessage } = useFormat()
interface Suggestion { id: string; shopId: string; entityType: string; payload: Record<string, unknown>; status: string; createdAt: string }
const { data: suggestions, refresh } = await useAsyncData('admin-suggestions', () => api.get<Suggestion[]>('/admin/suggestions'))
async function decide(id: string, status: 'approved' | 'rejected' | 'merged') {
  try {
    await api.patch(`/admin/suggestions/${id}`, { status })
    toast.success('تصمیم ثبت شد.')
    await refresh()
  } catch (error) { toast.error(errorMessage(error)) }
}
</script>

<template>
  <div>
    <header class="mb-6"><p class="m-0 text-sm font-700 text-brand-700">صف بررسی</p><h1 class="mb-0 mt-1 text-2xl font-950">پیشنهادهای اطلاعات پایه</h1></header>
    <section class="card overflow-hidden">
      <div v-if="suggestions?.length" class="divide-y divide-black/5">
        <div v-for="item in suggestions" :key="item.id" class="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <span class="grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-amber-700"><span class="i-lucide-lightbulb h-5 w-5" /></span>
          <div class="flex-1"><strong class="block text-sm">{{ item.payload.description || item.entityType }}</strong><span class="mt-1 block text-xs text-ink/40">{{ item.entityType }} • {{ dateTime(item.createdAt) }}</span></div>
          <div v-if="item.status === 'pending'" class="flex gap-2"><button class="btn-primary px-3 py-2" @click="decide(item.id, 'approved')">تأیید</button><button class="btn-secondary px-3 py-2" @click="decide(item.id, 'merged')">ادغام</button><button class="btn-ghost px-3 py-2 text-danger" @click="decide(item.id, 'rejected')">رد</button></div>
          <span v-else class="badge bg-black/5 text-ink/50">{{ item.status }}</span>
        </div>
      </div>
      <AppEmptyState v-else title="پیشنهادی در صف نیست" />
    </section>
  </div>
</template>
