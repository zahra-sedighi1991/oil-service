<script setup lang="ts">
import type { AdminShopListItem, AdminShopStatus } from '~/types/admin'

definePageMeta({ middleware: ['auth', 'admin'] })
useHead({ title: 'مدیریت فروشگاه‌ها' })

const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()
const { number, money, date, dateTime, errorMessage } = useFormat()
const search = ref(typeof route.query.search === 'string' ? route.query.search : '')
const status = ref<AdminShopStatus | 'all'>(
  ['active', 'pending', 'suspended', 'closed'].includes(String(route.query.status))
    ? route.query.status as AdminShopStatus
    : 'all'
)
const appliedSearch = ref(search.value)

const statusMeta: Record<AdminShopStatus, { label: string; class: string }> = {
  active: { label: 'فعال', class: 'bg-emerald-50 text-emerald-700' },
  pending: { label: 'در انتظار', class: 'bg-amber-50 text-amber-700' },
  suspended: { label: 'تعلیق‌شده', class: 'bg-red-50 text-danger' },
  closed: { label: 'بسته', class: 'bg-black/5 text-muted' }
}
const filters: Array<{ value: AdminShopStatus | 'all'; label: string }> = [
  { value: 'all', label: 'همه' },
  { value: 'pending', label: 'در انتظار' },
  { value: 'active', label: 'فعال' },
  { value: 'suspended', label: 'تعلیق‌شده' },
  { value: 'closed', label: 'بسته' }
]

const query = computed(() => ({
  ...(appliedSearch.value ? { search: appliedSearch.value } : {}),
  ...(status.value !== 'all' ? { status: status.value } : {})
}))
const { data: shops, pending, refresh } = await useAsyncData(
  'admin-shops-directory',
  () => api.get<AdminShopListItem[]>('/admin/shops', query.value),
  { watch: [status, appliedSearch] }
)

function applySearch() {
  appliedSearch.value = search.value.trim()
  syncQuery()
}
function selectStatus(value: AdminShopStatus | 'all') {
  status.value = value
  syncQuery()
}
function syncQuery() {
  router.replace({ query: { ...(appliedSearch.value ? { search: appliedSearch.value } : {}), ...(status.value !== 'all' ? { status: status.value } : {}) } })
}
async function changeStatus(shop: AdminShopListItem, value: AdminShopStatus) {
  try {
    await api.patch(`/admin/shops/${shop.id}/status`, { status: value })
    toast.success('وضعیت فروشگاه به‌روزرسانی شد.')
    await refresh()
  } catch (error) {
    toast.error(errorMessage(error))
  }
}
function onStatusChange(shop: AdminShopListItem, event: Event) {
  changeStatus(shop, (event.target as HTMLSelectElement).value as AdminShopStatus)
}
</script>

<template>
  <div class="list-page">
    <header class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 class="m-0 text-xl font-900">فروشگاه‌ها</h1><p class="mb-0 mt-1.5 text-sm text-muted">جست‌وجو، بررسی عملکرد و مدیریت دسترسی هر تعویض‌روغنی</p></div>
      <NuxtLink to="/admin/activity" class="btn-secondary no-underline"><span class="i-lucide-scroll-text h-4.5 w-4.5" />رویدادهای سامانه</NuxtLink>
    </header>

    <section class="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <form class="relative" @submit.prevent="applySearch">
        <span class="i-lucide-search pointer-events-none absolute right-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted" />
        <input v-model="search" class="field py-2.5 pr-10" placeholder="نام فروشگاه، مدیر، شهر یا شماره تماس" />
        <button v-if="search" type="button" class="absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg border-0 bg-transparent text-muted" aria-label="پاک کردن جست‌وجو" @click="search = ''; applySearch()"><span class="i-lucide-x h-4 w-4" /></button>
      </form>
      <div class="scrollbar-none flex gap-1 overflow-x-auto rounded-xl border border-black/7 bg-white p-1">
        <button v-for="item in filters" :key="item.value" type="button" class="shrink-0 rounded-lg border-0 px-3 py-2 text-xs font-700 transition" :class="status === item.value ? 'bg-ink text-white' : 'bg-transparent text-muted hover:bg-black/4'" @click="selectStatus(item.value)">{{ item.label }}</button>
      </div>
    </section>

    <section class="list-panel">
      <div class="mb-2 flex items-center justify-between px-1 text-xs text-muted"><span>{{ pending ? 'در حال دریافت…' : `${number(shops?.length)} فروشگاه` }}</span><span>حداکثر ۲۰۰ نتیجه تازه</span></div>
      <div v-if="shops?.length" class="list-scroll card-stack">
        <article v-for="shop in shops" :key="shop.id" class="card p-3.5 sm:p-4">
          <div class="flex items-start gap-3">
            <NuxtLink :to="`/admin/shops/${shop.id}`" class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-800 no-underline"><span class="i-lucide-store h-5 w-5" /></NuxtLink>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2"><NuxtLink :to="`/admin/shops/${shop.id}`" class="truncate text-sm font-900 text-ink no-underline hover:text-brand-700">{{ shop.name }}</NuxtLink><span class="badge" :class="statusMeta[shop.status].class">{{ statusMeta[shop.status].label }}</span></div>
              <p class="mb-0 mt-1 truncate text-xs text-muted">{{ shop.ownerName }} · {{ shop.city || 'شهر ثبت نشده' }} · <span dir="ltr">{{ shop.publicPhone }}</span></p>
            </div>
            <NuxtLink :to="`/admin/shops/${shop.id}`" class="btn-ghost hidden px-3 py-2 no-underline sm:inline-flex">جزئیات<span class="i-lucide-chevron-left h-4 w-4" /></NuxtLink>
          </div>

          <div class="mt-3 grid grid-cols-2 gap-2 border-y border-black/6 py-3 text-xs sm:grid-cols-5">
            <div><span class="block text-muted">مشتری / خودرو</span><strong class="mt-1 block">{{ number(shop.customers) }} / {{ number(shop.vehicles) }}</strong></div>
            <div><span class="block text-muted">کل سرویس</span><strong class="mt-1 block">{{ number(shop.services) }}</strong></div>
            <div><span class="block text-muted">سرویس این ماه</span><strong class="mt-1 block">{{ number(shop.servicesThisMonth) }}</strong></div>
            <div><span class="block text-muted">درآمد ثبت‌شده</span><strong class="mt-1 block">{{ money(shop.revenue, shop.currency) }}</strong></div>
            <div class="col-span-2 sm:col-span-1"><span class="block text-muted">آخرین سرویس</span><strong class="mt-1 block">{{ dateTime(shop.lastServiceAt) }}</strong></div>
          </div>

          <div class="mt-3 flex items-center justify-between gap-3">
            <span class="text-[11px] text-muted">عضویت: {{ date(shop.createdAt) }}</span>
            <label class="flex items-center gap-2 text-xs text-muted"><span>وضعیت</span><select :value="shop.status" class="field w-32 py-1.5" @change="onStatusChange(shop, $event)"><option value="pending">در انتظار</option><option value="active">فعال</option><option value="suspended">تعلیق</option><option value="closed">بسته</option></select></label>
          </div>
        </article>
      </div>
      <AppEmptyState v-else class="card" icon="i-lucide-search-x" title="فروشگاهی پیدا نشد" description="عبارت جست‌وجو یا فیلتر وضعیت را تغییر دهید." />
    </section>
  </div>
</template>
