<script setup lang="ts">
import type { Dashboard, Invoice } from '~/types/api'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'نمای کلی' })

const api = useApi()
const { number, money, dateTime } = useFormat()
const { data: dashboard, pending } = await useAsyncData('dashboard', () => api.get<Dashboard>('/dashboard'))
const { data: invoices } = await useAsyncData('dashboard-invoices', () => api.get<Invoice[]>('/invoices'))

const stats = computed(() => [
  { label: 'سرویس‌های امروز', value: dashboard.value?.today.services ?? 0, icon: 'i-lucide-wrench', tone: 'bg-brand-50 text-brand-700' },
  { label: 'مشتری جدید امروز', value: dashboard.value?.today.newCustomers ?? 0, icon: 'i-lucide-user-plus', tone: 'bg-blue-50 text-blue-700' },
  { label: 'مشتری بازگشتی', value: dashboard.value?.today.returningCustomers ?? 0, icon: 'i-lucide-rotate-ccw', tone: 'bg-amber-50 text-amber-700' },
  { label: 'سرویس ماه', value: dashboard.value?.month.services ?? 0, icon: 'i-lucide-calendar-range', tone: 'bg-violet-50 text-violet-700' }
])
</script>

<template>
  <div>
    <header class="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h1 class="m-0 text-xl font-800">نمای کلی فروشگاه</h1>
        <p class="mb-0 mt-2 text-sm text-muted">وضعیت سرویس‌ها و مشتری‌ها در یک نگاه</p>
      </div>
      <NuxtLink to="/service-orders/new" class="btn-primary no-underline"><span class="i-lucide-plus h-5 w-5" />ثبت سرویس جدید</NuxtLink>
    </header>

    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      <article v-for="stat in stats" :key="stat.label" class="card p-2 sm:p-3">
        <div class="mb-4 flex items-center justify-between">
          <span class="grid h-10 w-10 place-items-center rounded-xl" :class="stat.tone"><span class="h-5 w-5" :class="stat.icon" /></span>
          <span v-if="pending" class="h-5 w-12 animate-pulse rounded bg-black/6" />
          <strong v-else class="block text-2xl font-800 sm:text-3xl">{{ number(stat.value) }}</strong>
        </div>
        <span class="mt-1 block text-xs leading-5 text-muted sm:text-sm">{{ stat.label }}</span>
      </article>
    </div>

    <div class="mt-6 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
      <section>
        <header class="mb-3 flex items-center justify-between px-1">
          <div><h2 class="m-0 text-base font-700">آخرین فاکتورها</h2><p class="m-0 mt-1 text-xs text-muted">تازه‌ترین فعالیت‌های ثبت‌شده</p></div>
          <NuxtLink to="/invoices" class="btn-ghost no-underline">مشاهده همه</NuxtLink>
        </header>
        <div v-if="invoices?.length" class="grid gap-3">
          <NuxtLink v-for="invoice in invoices.slice(0, 5)" :key="invoice.id" :to="`/invoices/${invoice.id}`" class="card-interactive flex items-center gap-4 px-4 py-3.5 text-ink no-underline sm:px-5">
            <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-black/4 text-muted"><span class="i-lucide-receipt h-5 w-5" /></span>
            <div class="min-w-0 flex-1"><strong class="block truncate text-sm">{{ invoice.invoiceNo }}</strong><span class="mt-0.5 block truncate text-xs text-muted">{{ invoice.order?.customer?.name || 'مشتری بدون نام' }}</span><span class="mt-0.5 block text-[11px] text-muted">{{ dateTime(invoice.issuedAt) }}</span></div>
            <strong class="text-sm">{{ money(invoice.totalAmount, invoice.currency) }}</strong>
          </NuxtLink>
        </div>
        <AppEmptyState v-else class="card" title="هنوز فاکتوری ثبت نشده" description="اولین سرویس را ثبت کنید تا اینجا نمایش داده شود."><NuxtLink to="/service-orders/new" class="btn-secondary no-underline">ثبت اولین سرویس</NuxtLink></AppEmptyState>
      </section>

      <section class="card p-5">
        <div class="mb-5 flex items-center justify-between"><h2 class="m-0 text-base font-700">عملکرد ماه جاری</h2><span class="i-lucide-chart-no-axes-combined h-5 w-5 text-brand-600" /></div>
        <div class="rounded-2xl bg-ink p-5 text-white">
          <div class="grid grid-cols-2 divide-x divide-x-reverse divide-white/10">
            <div class="pl-4"><p class="m-0 text-xs text-white/70">مشتریان یکتای ماه</p><strong class="mt-2 block text-3xl font-800">{{ number(dashboard?.month.uniqueCustomers) }}</strong></div>
            <div class="pr-4"><p class="m-0 text-xs text-white/70">فاکتورهای صادرشده</p><strong class="mt-2 block text-3xl font-800">{{ number(dashboard?.month.invoices) }}</strong></div>
          </div>
        </div>
        <div class="mt-4 grid grid-cols-2 gap-3">
          <NuxtLink to="/customers" class="rounded-xl border border-black/7 p-3 text-ink no-underline transition hover:bg-brand-50"><span class="i-lucide-search mb-2 block h-5 w-5 text-brand-600" /><strong class="text-sm">یافتن مشتری</strong></NuxtLink>
          <NuxtLink to="/catalog" class="rounded-xl border border-black/7 p-3 text-ink no-underline transition hover:bg-brand-50"><span class="i-lucide-tags mb-2 block h-5 w-5 text-brand-600" /><strong class="text-sm">قیمت‌گذاری</strong></NuxtLink>
          <NuxtLink to="/reminders" class="col-span-2 flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/60 p-3 text-ink no-underline transition hover:bg-brand-50">
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-brand-800 shadow-sm"><span class="i-lucide-bell-ring h-5 w-5" /></span>
            <span class="min-w-0 flex-1"><strong class="block text-sm">پیگیری موعدهای سرویس</strong><span class="mt-0.5 block text-[11px] text-muted">مشاهده مشتریان امروز و آماده‌کردن پیامک</span></span>
            <span class="i-lucide-chevron-left h-4 w-4 text-muted" />
          </NuxtLink>
        </div>
      </section>
    </div>
  </div>
</template>
