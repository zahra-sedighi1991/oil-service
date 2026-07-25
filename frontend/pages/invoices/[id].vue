<script setup lang="ts">
import type { Invoice } from '~/types/api'

definePageMeta({ middleware: 'auth' })
const route = useRoute()
const api = useApi()
const { money, number, dateTime } = useFormat()
const { data: invoice } = await useAsyncData(`invoice-${route.params.id}`, () => api.get<Invoice>(`/invoices/${route.params.id}`))
useHead({ title: () => invoice.value ? `فاکتور ${invoice.value.invoiceNo}` : 'فاکتور' })
function printInvoice() {
  window.print()
}
</script>

<template>
  <div v-if="invoice" class="mx-auto max-w-4xl">
    <div class="mb-5 flex items-center justify-between print:hidden">
      <NuxtLink to="/invoices" class="inline-flex items-center gap-1 text-sm text-ink/50 no-underline"><span class="i-lucide-arrow-right" />بازگشت</NuxtLink>
      <button class="btn-secondary" @click="printInvoice"><span class="i-lucide-printer h-4 w-4" />چاپ فاکتور</button>
    </div>
    <article class="card overflow-hidden bg-white">
      <header class="flex flex-col justify-between gap-5 bg-ink p-6 text-white sm:flex-row sm:items-start sm:p-8">
        <div><span class="text-xs text-brand-300">فاکتور سرویس خودرو</span><h1 class="mb-0 mt-2 text-2xl font-950">{{ invoice.invoiceNo }}</h1><p class="mb-0 mt-2 text-sm text-white/45">{{ dateTime(invoice.issuedAt) }}</p></div>
        <span class="badge w-fit bg-white/10 text-white">{{ invoice.status === 'issued' ? 'صادرشده' : 'باطل‌شده' }}</span>
      </header>
      <div class="p-6 sm:p-8">
        <div v-if="invoice.order" class="mb-7 grid gap-3 rounded-2xl bg-black/[.025] p-4 sm:grid-cols-3">
          <div><span class="block text-xs text-ink/40">مشتری</span><strong class="mt-1 block text-sm">{{ invoice.order.customer?.name }}</strong></div>
          <div><span class="block text-xs text-ink/40">خودرو</span><strong class="mt-1 block text-sm">{{ invoice.order.vehicle?.brand?.nameFa }} {{ invoice.order.vehicle?.model?.nameFa }}</strong></div>
          <div><span class="block text-xs text-ink/40">کیلومتر</span><strong class="mt-1 block text-sm">{{ number(invoice.order.odometer) }}</strong></div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-sm">
            <thead><tr class="border-b border-black/10 text-right text-xs text-ink/40"><th class="py-3 font-700">شرح</th><th class="py-3 font-700">نوع</th><th class="py-3 text-center font-700">تعداد</th><th class="py-3 text-left font-700">قیمت واحد</th><th class="py-3 text-left font-700">مبلغ</th></tr></thead>
            <tbody><tr v-for="line in invoice.lines" :key="line.id" class="border-b border-black/5"><td class="py-4 font-700">{{ line.descriptionSnapshot }}</td><td class="py-4 text-ink/45">{{ line.itemType === 'product' ? 'محصول' : 'خدمت' }}</td><td class="py-4 text-center">{{ number(line.quantity) }}</td><td class="py-4 text-left">{{ money(line.unitPrice, invoice.currency) }}</td><td class="py-4 text-left font-800">{{ money(line.total, invoice.currency) }}</td></tr></tbody>
          </table>
        </div>
        <div class="mr-auto mt-7 max-w-sm rounded-2xl bg-brand-50 p-5">
          <div class="flex items-center justify-between"><span class="font-800 text-brand-900">جمع نهایی</span><strong class="text-xl font-950 text-brand-800">{{ money(invoice.totalAmount, invoice.currency) }}</strong></div>
        </div>
      </div>
    </article>
  </div>
</template>

<style>
@media print {
  body { background: white !important; }
  aside, header:not(article header), nav { display: none !important; }
  main { margin: 0 !important; padding: 0 !important; }
  article { border: 0 !important; box-shadow: none !important; }
}
</style>
