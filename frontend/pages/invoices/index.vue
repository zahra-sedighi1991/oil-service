<script setup lang="ts">
import type { Invoice } from '~/types/api'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'فاکتورها' })
const api = useApi()
const { money, dateTime } = useFormat()
const search = ref('')
const { data: invoices, pending } = await useAsyncData('invoices', () => api.get<Invoice[]>('/invoices'))

function normalizeSearch(value?: string) {
  const persian = '۰۱۲۳۴۵۶۷۸۹'
  const arabic = '٠١٢٣٤٥٦٧٨٩'
  return (value || '')
    .toLowerCase()
    .replace(/[۰-۹]/g, digit => String(persian.indexOf(digit)))
    .replace(/[٠-٩]/g, digit => String(arabic.indexOf(digit)))
    .replace(/[\s-]/g, '')
}

const filtered = computed(() => {
  const query = normalizeSearch(search.value)
  if (!query) return invoices.value || []
  return (invoices.value || []).filter((invoice) => {
    const customer = invoice.order?.customer
    const vehicle = invoice.order?.vehicle
    return [
      invoice.invoiceNo,
      customer?.name,
      customer?.mobileDisplay,
      customer?.mobileNormalized,
      vehicle?.plateDisplay,
      vehicle?.plateNormalized,
      vehicle?.temporaryIdentifier
    ].some(value => normalizeSearch(value).includes(query))
  })
})
</script>

<template>
  <div class="list-page">
      <h1 class="mb-3 mt-1 text-xl font-800">فاکتورها</h1>
    <section class="card list-panel">
      <div class="border-b border-black/6 p-4">
        <div class="relative max-w-lg"><span class="i-lucide-search absolute right-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ink/30" /><input v-model="search" class="field py-2.5 pr-10" placeholder="شماره فاکتور، مشتری، موبایل یا پلاک..."></div>
      </div>
      <div v-if="pending" class="scroll-container list-scroll space-y-px"><div v-for="i in 5" :key="i" class="h-18 animate-pulse bg-black/[.025]" /></div>
      <div v-else-if="filtered.length" class="scroll-container list-scroll divide-y divide-black/5">
        <NuxtLink v-for="invoice in filtered" :key="invoice.id" :to="`/invoices/${invoice.id}`" class="block px-4 py-4 text-ink no-underline transition hover:bg-brand-50/50 sm:px-5">
          <div class="flex items-start justify-between gap-3">
            <div><strong class="block text-sm">{{ invoice.invoiceNo }}</strong><span class="mt-1 block text-xs text-ink/40">{{ dateTime(invoice.issuedAt) }}</span></div>
            <span class="badge shrink-0" :class="invoice.status === 'issued' ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-700'">{{ invoice.status === 'issued' ? 'صادرشده' : 'باطل‌شده' }}</span>
          </div>
          <div class="mt-3 flex items-end justify-between gap-3">
            <div class="min-w-0 text-sm text-ink/55">
              <strong class="block truncate font-700 text-ink/70">{{ invoice.order?.customer?.name || 'مشتری بدون نام' }}</strong>
              <span class="mt-0.5 block truncate text-xs">{{ invoice.order?.vehicle?.plateDisplay || invoice.order?.vehicle?.temporaryIdentifier || 'خودروی بدون پلاک' }}</span>
            </div>
            <strong class="shrink-0 text-sm text-brand-800">{{ money(invoice.totalAmount, invoice.currency) }}</strong>
          </div>
        </NuxtLink>
      </div>
      <AppEmptyState v-else icon="i-lucide-receipt" title="فاکتوری وجود ندارد" description="پس از نهایی‌سازی سرویس، فاکتور اینجا ظاهر می‌شود." />
    </section>
  </div>
</template>
