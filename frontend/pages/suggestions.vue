<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useHead({ title: 'پیشنهادها' })
const api = useApi()
const { dateTime } = useFormat()
interface Suggestion { id: string; entityType: string; payload: Record<string, unknown>; status: string; createdAt: string; decisionNote?: string }
const { data: suggestions } = await useAsyncData('suggestions', () => api.get<Suggestion[]>('/suggestions'))
</script>

<template>
  <div>
    <header class="mb-6"><p class="m-0 text-sm font-700 text-brand-700">تکمیل اطلاعات پایه</p><h1 class="mb-0 mt-1 text-2xl font-950">پیشنهادهای کاتالوگ</h1><p class="mb-0 mt-2 text-sm text-ink/45">وضعیت آیتم‌های موقت و پیشنهادهای ارسال‌شده به مدیر سامانه</p></header>
    <section class="card overflow-hidden">
      <div v-if="suggestions?.length" class="divide-y divide-black/5">
        <div v-for="item in suggestions" :key="item.id" class="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
          <span class="grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-amber-700"><span class="i-lucide-lightbulb h-5 w-5" /></span>
          <div class="flex-1"><strong class="block text-sm">{{ item.payload.description || item.entityType }}</strong><span class="mt-1 block text-xs text-ink/40">{{ item.entityType === 'product' ? 'محصول' : 'خدمت' }} • {{ dateTime(item.createdAt) }}</span></div>
          <span class="badge" :class="item.status === 'pending' ? 'bg-amber-50 text-amber-700' : item.status === 'approved' ? 'bg-brand-50 text-brand-700' : 'bg-black/5 text-ink/50'">{{ { pending: 'در انتظار', approved: 'تأییدشده', rejected: 'ردشده', merged: 'ادغام‌شده' }[item.status] || item.status }}</span>
        </div>
      </div>
      <AppEmptyState v-else icon="i-lucide-lightbulb" title="پیشنهادی ثبت نشده" description="آیتم‌های موقت هنگام ثبت سرویس به‌صورت خودکار اینجا قرار می‌گیرند." />
    </section>
  </div>
</template>
