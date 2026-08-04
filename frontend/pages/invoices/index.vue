<script setup lang="ts">
import type { Invoice } from '~/types/api'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'فاکتورها' })
const api = useApi()
const { money, dateTime } = useFormat()
const search = ref('')
const { data: invoices, pending } = await useAsyncData('invoices', () => api.get<Invoice[]>('/invoices'))
const filtered = computed(() => invoices.value?.filter(item =>
  !search.value || item.invoiceNo.toLowerCase().includes(search.value.toLowerCase())
) || [])
</script>

<template>
  <div class="list-page">
      <h1 class="mb-3 mt-1 text-xl font-800">فاکتورها</h1>
    <section class="card list-panel">
      <div class="border-b border-black/6 p-4">
        <div class="relative max-w-sm"><span class="i-lucide-search absolute right-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ink/30" /><input v-model="search" class="field py-2.5 pr-10" placeholder="شماره فاکتور..."></div>
      </div>
      <div v-if="pending" class="scroll-container list-scroll space-y-px"><div v-for="i in 5" :key="i" class="h-18 animate-pulse bg-black/[.025]" /></div>
      <div v-else-if="filtered.length" class="scroll-container list-scroll divide-y divide-black/5">
        <NuxtLink v-for="invoice in filtered" :key="invoice.id" :to="`/invoices/${invoice.id}`" class="grid items-center gap-3 px-4 py-4 text-ink no-underline transition hover:bg-brand-50/50 sm:grid-cols-[1fr_1fr_auto_auto] sm:px-5">
          <div><strong class="block text-sm">{{ invoice.invoiceNo }}</strong><span class="mt-1 block text-xs text-ink/40">{{ dateTime(invoice.issuedAt) }}</span></div>
          <span class="hidden text-sm text-ink/50 sm:block">{{ invoice.order?.customer?.name || '—' }}</span>
          <span class="badge w-fit" :class="invoice.status === 'issued' ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-700'">{{ invoice.status === 'issued' ? 'صادرشده' : 'باطل‌شده' }}</span>
          <strong class="text-sm">{{ money(invoice.totalAmount, invoice.currency) }}</strong>
        </NuxtLink>
      </div>
      <AppEmptyState v-else icon="i-lucide-receipt" title="فاکتوری وجود ندارد" description="پس از نهایی‌سازی سرویس، فاکتور اینجا ظاهر می‌شود." />
    </section>
  </div>
</template>
