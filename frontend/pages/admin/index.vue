<script setup lang="ts">
import type { AdminOverview, AdminShopListItem, AdminShopStatus } from '~/types/admin'

definePageMeta({ middleware: ['auth', 'admin'] })
useHead({ title: 'داشبورد مدیریت سامانه' })

const api = useApi()
const { number, money, dateTime } = useFormat()
const { data: overview, pending } = await useAsyncData('admin-overview', () => api.get<AdminOverview>('/admin/shops/overview'))
const { data: shops } = await useAsyncData('admin-recent-shops', () => api.get<AdminShopListItem[]>('/admin/shops'))

const statusMeta: Record<AdminShopStatus, { label: string; class: string }> = {
  active: { label: 'فعال', class: 'bg-emerald-50 text-emerald-700' },
  pending: { label: 'در انتظار تأیید', class: 'bg-amber-50 text-amber-700' },
  suspended: { label: 'تعلیق‌شده', class: 'bg-red-50 text-danger' },
  closed: { label: 'بسته', class: 'bg-black/5 text-muted' }
}

const stats = computed<Array<{ label: string; value?: number; icon: string; tone: string; money?: boolean }>>(() => [
  { label: 'فروشگاه فعال', value: overview.value?.shops.active, icon: 'i-lucide-store', tone: 'bg-emerald-50 text-emerald-700' },
  { label: 'سرویس‌های این ماه', value: overview.value?.operations.servicesThisMonth, icon: 'i-lucide-wrench', tone: 'bg-brand-50 text-brand-800' },
  { label: 'مشتریان ثبت‌شده', value: overview.value?.operations.customers, icon: 'i-lucide-users', tone: 'bg-sky-50 text-sky-700' },
  { label: 'درآمد این ماه', value: overview.value?.operations.revenueThisMonth, icon: 'i-lucide-wallet-cards', tone: 'bg-violet-50 text-violet-700', money: true }
])

const attentionItems = computed(() => [
  { label: 'فروشگاه در انتظار تأیید', value: overview.value?.shops.pending || 0, to: '/admin/shops?status=pending', icon: 'i-lucide-store' },
  { label: 'پیشنهاد در انتظار بررسی', value: overview.value?.catalog.pendingSuggestions || 0, to: '/admin/suggestions', icon: 'i-lucide-lightbulb' },
  { label: 'فروشگاه تعلیق‌شده', value: overview.value?.shops.suspended || 0, to: '/admin/shops?status=suspended', icon: 'i-lucide-shield-alert' }
])
</script>

<template>
  <div class="pb-4">
    <header class="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        <h1 class="m-0 text-xl font-900">داشبورد مدیریت</h1>
        <p class="mb-0 mt-1.5 text-sm text-muted">وضعیت کل سامانه، فروشگاه‌ها و موارد نیازمند رسیدگی</p>
      </div>
      <NuxtLink to="/admin/shops" class="btn-primary no-underline"><span class="i-lucide-store h-4.5 w-4.5" />مدیریت فروشگاه‌ها</NuxtLink>
    </header>

    <section class="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <article v-for="stat in stats" :key="stat.label" class="card p-3.5 sm:p-4">
        <div class="mb-3 flex items-center justify-between">
          <span class="grid h-9 w-9 place-items-center rounded-xl" :class="stat.tone"><span class="h-4.5 w-4.5" :class="stat.icon" /></span>
          <span v-if="pending" class="h-6 w-16 animate-pulse rounded bg-black/5" />
          <strong v-else class="text-lg font-900 sm:text-2xl">{{ stat.money ? money(stat.value, 'TOMAN') : number(stat.value) }}</strong>
        </div>
        <span class="text-xs text-muted sm:text-sm">{{ stat.label }}</span>
      </article>
    </section>

    <div class="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
      <section>
        <header class="mb-3 flex items-center justify-between px-1">
          <div><h2 class="m-0 text-base font-800">فروشگاه‌های تازه</h2><p class="m-0 mt-1 text-xs text-muted">آخرین ثبت‌نام‌ها و وضعیت فعالیت</p></div>
          <NuxtLink to="/admin/shops" class="btn-ghost py-2 no-underline">مشاهده همه</NuxtLink>
        </header>
        <div v-if="shops?.length" class="grid gap-2.5">
          <NuxtLink v-for="shop in shops.slice(0, 6)" :key="shop.id" :to="`/admin/shops/${shop.id}`" class="card-interactive flex items-center gap-3 px-4 py-3 text-ink no-underline">
            <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-800"><span class="i-lucide-store h-5 w-5" /></span>
            <div class="min-w-0 flex-1"><strong class="block truncate text-sm">{{ shop.name }}</strong><span class="mt-0.5 block truncate text-xs text-muted">{{ shop.ownerName }} · {{ shop.city || 'شهر ثبت نشده' }}</span></div>
            <div class="hidden text-left text-xs text-muted sm:block"><span class="block">{{ number(shop.servicesThisMonth) }} سرویس در ماه</span><span class="mt-0.5 block">{{ dateTime(shop.lastServiceAt) }}</span></div>
            <span class="badge shrink-0" :class="statusMeta[shop.status].class">{{ statusMeta[shop.status].label }}</span>
          </NuxtLink>
        </div>
        <AppEmptyState v-else class="card" icon="i-lucide-store" title="فروشگاهی ثبت نشده است" />
      </section>

      <aside class="grid content-start gap-4">
        <section class="card p-4">
          <div class="mb-3 flex items-center gap-2"><span class="i-lucide-circle-alert h-5 w-5 text-amber-600" /><h2 class="m-0 text-base font-800">نیازمند رسیدگی</h2></div>
          <div class="grid gap-2">
            <NuxtLink v-for="item in attentionItems" :key="item.label" :to="item.to" class="flex items-center gap-3 rounded-xl border border-black/6 px-3 py-2.5 text-ink no-underline transition hover:bg-brand-50">
              <span class="h-4.5 w-4.5 text-muted" :class="item.icon" /><span class="min-w-0 flex-1 text-xs font-700 sm:text-sm">{{ item.label }}</span><strong class="text-base">{{ number(item.value) }}</strong><span class="i-lucide-chevron-left h-4 w-4 text-muted" />
            </NuxtLink>
          </div>
        </section>

        <section class="card bg-ink p-4 text-white">
          <p class="m-0 text-xs text-white/60">نمای کلی استفاده از سامانه</p>
          <div class="mt-4 grid grid-cols-2 gap-3">
            <div><strong class="block text-xl font-900">{{ number(overview?.operations.vehicles) }}</strong><span class="text-xs text-white/65">خودرو</span></div>
            <div><strong class="block text-xl font-900">{{ number(overview?.operations.completedServices) }}</strong><span class="text-xs text-white/65">سرویس تکمیل‌شده</span></div>
            <div><strong class="block text-xl font-900">{{ number(overview?.shops.newThisMonth) }}</strong><span class="text-xs text-white/65">عضویت این ماه</span></div>
            <div><strong class="block text-xl font-900">{{ number((overview?.catalog.products || 0) + (overview?.catalog.services || 0)) }}</strong><span class="text-xs text-white/65">اقلام کاتالوگ</span></div>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>
