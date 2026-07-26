<script setup lang="ts">
import { resolveApiBase } from '~/utils/api-base'

definePageMeta({ layout: false })
const route = useRoute()
const config = useRuntimeConfig()
const { number, money, date } = useFormat()
const { data: book, error } = await useAsyncData(`public-book-${route.params.token}`, () =>
  $fetch<any>(`/public/v1/service-book/${route.params.token}`, {
    baseURL: resolveApiBase(config.public.publicApiBase)
  })
)
useHead({
  title: () => book.value ? `دفترچه سرویس ${book.value.vehicle.brand} ${book.value.vehicle.model}` : 'دفترچه سرویس',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})
</script>

<template>
  <main class="min-h-screen px-4 py-6 sm:py-10">
    <div v-if="error" class="card mx-auto max-w-lg p-8 text-center">
      <span class="i-lucide-link-2-off mx-auto block h-12 w-12 text-danger" />
      <h1 class="mb-0 mt-5 text-xl font-950">این لینک معتبر نیست</h1>
      <p class="mb-0 mt-2 text-sm leading-6 text-ink/50">برای دریافت لینک جدید با تعویض روغنی تماس بگیرید.</p>
    </div>
    <div v-else-if="book" class="mx-auto max-w-3xl">
      <header class="card overflow-hidden">
        <div class="bg-ink p-6 text-white sm:p-8">
          <div class="flex items-center justify-between"><span class="badge bg-white/10 text-white">دفترچه سرویس دیجیتال</span><span class="i-lucide-droplets h-6 w-6 text-brand-300" /></div>
          <h1 class="mb-0 mt-7 text-2xl font-950">{{ book.vehicle.brand }} {{ book.vehicle.model }}</h1>
          <div class="mt-3 flex flex-wrap gap-2 text-sm text-white/55"><span>{{ book.vehicle.plate }}</span><span>•</span><span>{{ number(book.vehicle.lastOdometer) }} کیلومتر</span></div>
        </div>
        <div v-if="book.nextDue" class="grid gap-3 p-5 sm:grid-cols-2">
          <div class="rounded-xl bg-amber-50 p-4"><span class="block text-xs text-amber-700">سررسید کیلومتری بعدی</span><strong class="mt-1 block">{{ book.nextDue.dueOdometer ? `${number(book.nextDue.dueOdometer)} کیلومتر` : '—' }}</strong><small class="text-ink/40">{{ book.nextDue.dueOdometerItem }}</small></div>
          <div class="rounded-xl bg-brand-50 p-4"><span class="block text-xs text-brand-700">سررسید زمانی بعدی</span><strong class="mt-1 block">{{ date(book.nextDue.dueDate) }}</strong><small class="text-ink/40">{{ book.nextDue.dueDateItem }}</small></div>
        </div>
      </header>

      <section class="mt-5">
        <h2 class="mb-4 text-lg font-950">تاریخچه سرویس‌ها</h2>
        <div v-if="book.services?.length" class="space-y-4">
          <article v-for="service in book.services" :key="service.id" class="card p-5">
            <div class="mb-5 flex items-start justify-between gap-3"><div><strong class="block">{{ date(service.serviceDate) }}</strong><span class="mt-1 block text-xs text-ink/40">{{ number(service.odometer) }} کیلومتر</span></div><span class="badge bg-brand-50 text-brand-700">{{ service.invoice?.invoiceNo }}</span></div>
            <div class="space-y-2 border-t border-black/6 pt-4">
              <div v-for="(item, i) in service.products" :key="`p-${i}`" class="flex items-center gap-2 text-sm"><span class="i-lucide-package h-4 w-4 text-brand-600" /><span>{{ item.displayName || item.description }}</span></div>
              <div v-for="(item, i) in service.services" :key="`s-${i}`" class="flex items-center gap-2 text-sm"><span class="i-lucide-wrench h-4 w-4 text-blue-600" /><span>{{ item.name || item.description }}</span></div>
            </div>
            <div v-if="service.invoice" class="mt-4 flex items-center justify-between border-t border-dashed border-black/8 pt-4 text-sm"><span class="text-ink/45">مبلغ فاکتور</span><strong>{{ money(service.invoice.totalAmount, service.invoice.currency) }}</strong></div>
          </article>
        </div>
        <AppEmptyState v-else title="سابقه‌ای ثبت نشده" />
      </section>

      <footer class="mt-7 rounded-2xl bg-ink p-5 text-center text-white">
        <strong class="block">{{ book.shop.name }}</strong>
        <p class="mb-0 mt-2 text-xs text-white/50">{{ book.shop.city }} {{ book.shop.address }} • {{ book.shop.phone }}</p>
      </footer>
    </div>
  </main>
</template>
