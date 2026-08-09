<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useHead({ title: 'پیشنهادها' })
const api = useApi()
const { dateTime } = useFormat()
interface Suggestion { id: string; entityType: string; payload: Record<string, unknown>; status: string; createdAt: string; decisionNote?: string }
const { data: suggestions } = await useAsyncData('suggestions', () => api.get<Suggestion[]>('/suggestions'))
</script>

<template>
  <div class="list-page">
      <h1 class="mb-3 mt-1 text-xl font-800">پیشنهادهای کاتالوگ</h1>
    <section class="card list-panel">
      <div v-if="suggestions?.length" class="scroll-container list-scroll divide-y divide-black/5">
        <div v-for="item in suggestions" :key="item.id" class="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
          <span class="grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-amber-700"><span class="i-lucide-lightbulb h-5 w-5" /></span>
          <div class="flex-1"><strong class="block text-sm">{{ item.payload.description || item.entityType }}</strong><span class="mt-1 block text-xs text-muted">{{ item.entityType === 'product' ? 'محصول' : 'خدمت' }} • {{ dateTime(item.createdAt) }}</span></div>
          <span class="badge" :class="item.status === 'pending' ? 'bg-amber-50 text-amber-700' : item.status === 'approved' ? 'bg-brand-50 text-brand-700' : 'bg-black/5 text-muted'">{{ { pending: 'در انتظار', approved: 'تأییدشده', rejected: 'ردشده', merged: 'ادغام‌شده' }[item.status] || item.status }}</span>
        </div>
      </div>
      <AppEmptyState v-else icon="i-lucide-lightbulb" title="پیشنهادی ثبت نشده" description="محصولات و خدمات خارج از کاتالوگ هنگام نهایی‌سازی سفارش، با نام واقعی‌شان به‌صورت خودکار اینجا قرار می‌گیرند." />
    </section>
  </div>
</template>
