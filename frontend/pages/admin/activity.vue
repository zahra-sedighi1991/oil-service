<script setup lang="ts">
import type { AdminAuditLog, AdminShopListItem } from '~/types/admin'

definePageMeta({ middleware: ['auth', 'admin'] })
useHead({ title: 'رویدادهای سامانه' })

const route = useRoute()
const router = useRouter()
const api = useApi()
const { dateTime, number } = useFormat()
const shopId = ref(typeof route.query.shopId === 'string' ? route.query.shopId : '')
const category = ref<'all' | 'admin' | 'service' | 'customer' | 'reminder' | 'catalog'>('all')
const search = ref('')

const { data: shops } = await useAsyncData('admin-activity-shops', () => api.get<AdminShopListItem[]>('/admin/shops'))
const { data: logs, pending } = await useAsyncData(
  'admin-audit-logs',
  () => api.get<AdminAuditLog[]>('/admin/audit-logs', shopId.value ? { shopId: shopId.value } : undefined),
  { watch: [shopId] }
)

const actionLabels: Record<string, string> = {
  'admin.shop_updated': 'ویرایش مشخصات فروشگاه توسط ادمین',
  'admin.shop_user_status_changed': 'تغییر دسترسی کاربر توسط ادمین',
  'shop.updated': 'ویرایش تنظیمات فروشگاه',
  'shop.status_changed': 'تغییر وضعیت فروشگاه',
  'suggestion.decided': 'تصمیم‌گیری درباره پیشنهاد',
  'customer.updated': 'ویرایش اطلاعات مشتری',
  'vehicle.owner_transferred': 'انتقال مالکیت خودرو',
  'public_link.regenerated': 'بازسازی لینک عمومی خودرو',
  'public_link.issued_for_sharing': 'اشتراک‌گذاری لینک عمومی خودرو',
  'public_link.revoked': 'لغو دسترسی لینک عمومی',
  'shop_product.configured': 'تغییر تنظیمات محصول',
  'shop_service.configured': 'تغییر تنظیمات خدمت',
  'service_reminder.sms_composer_opened': 'بازکردن برنامه پیامک یادآوری'
}
const categoryItems = [
  { value: 'all', label: 'همه رویدادها' },
  { value: 'admin', label: 'مدیریتی' },
  { value: 'service', label: 'سرویس و اشتراک' },
  { value: 'customer', label: 'مشتری و خودرو' },
  { value: 'reminder', label: 'یادآوری' },
  { value: 'catalog', label: 'کاتالوگ' }
] as const

const shopNames = computed(() => Object.fromEntries((shops.value || []).map(item => [item.id, item.name])))
const filteredLogs = computed(() => (logs.value || []).filter((item) => {
  const action = item.action
  const matchesCategory = category.value === 'all'
    || (category.value === 'admin' && (action.startsWith('admin.') || action.startsWith('shop.status')))
    || (category.value === 'service' && (action.startsWith('public_link.') || action.startsWith('service_order.')))
    || (category.value === 'customer' && (action.startsWith('customer.') || action.startsWith('vehicle.')))
    || (category.value === 'reminder' && action.startsWith('service_reminder.'))
    || (category.value === 'catalog' && (action.startsWith('shop_product.') || action.startsWith('shop_service.') || action.startsWith('suggestion.')))
  if (!matchesCategory) return false
  const value = search.value.trim().toLowerCase()
  if (!value) return true
  return actionLabel(item).toLowerCase().includes(value)
    || (item.actorName || '').toLowerCase().includes(value)
    || (shopNames.value[item.shopId || ''] || '').toLowerCase().includes(value)
}))

function actionLabel(item: AdminAuditLog) {
  if (item.action.startsWith('service_reminder.status.')) return 'تغییر مرحله پیگیری یادآوری سرویس'
  return actionLabels[item.action] || item.action.replaceAll('.', ' · ')
}
function eventMeta(action: string) {
  if (action.startsWith('admin.') || action === 'shop.status_changed') return { icon: 'i-lucide-shield-check', tone: 'bg-violet-50 text-violet-700' }
  if (action.startsWith('service_reminder.')) return { icon: 'i-lucide-bell-ring', tone: 'bg-amber-50 text-amber-700' }
  if (action.startsWith('public_link.')) return { icon: 'i-lucide-share-2', tone: 'bg-sky-50 text-sky-700' }
  if (action.startsWith('customer.') || action.startsWith('vehicle.')) return { icon: 'i-lucide-users', tone: 'bg-emerald-50 text-emerald-700' }
  if (action.startsWith('shop_product.') || action.startsWith('shop_service.') || action.startsWith('suggestion.')) return { icon: 'i-lucide-library-big', tone: 'bg-brand-50 text-brand-800' }
  return { icon: 'i-lucide-activity', tone: 'bg-black/5 text-muted' }
}
function selectShop(value: string) {
  shopId.value = value
  router.replace({ query: value ? { shopId: value } : {} })
}
function onShopChange(event: Event) {
  selectShop((event.target as HTMLSelectElement).value)
}
function entityLabel(value: string) {
  return ({ shop: 'فروشگاه', user: 'کاربر', customer: 'مشتری', vehicle: 'خودرو', suggestion: 'پیشنهاد', shop_product: 'محصول فروشگاه', shop_service: 'خدمت فروشگاه', vehicle_public_link: 'لینک عمومی' } as Record<string, string>)[value] || 'رویداد سامانه'
}
</script>

<template>
  <div class="list-page">
    <header class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 class="m-0 text-xl font-900">رویدادهای سامانه</h1><p class="mb-0 mt-1.5 text-sm text-muted">پیگیری تغییرات مهم بدون نمایش محتوای حساس یا داده‌های خام</p></div>
      <NuxtLink to="/admin/shops" class="btn-secondary no-underline"><span class="i-lucide-store h-4.5 w-4.5" />فروشگاه‌ها</NuxtLink>
    </header>

    <section class="mb-3 grid gap-2.5 md:grid-cols-[minmax(0,1fr)_minmax(14rem,.6fr)]">
      <div class="relative"><span class="i-lucide-search pointer-events-none absolute right-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted" /><input v-model="search" class="field py-2.5 pr-10" placeholder="جست‌وجو در عنوان، کاربر یا فروشگاه" /></div>
      <select :value="shopId" class="field py-2.5" aria-label="فیلتر فروشگاه" @change="onShopChange"><option value="">همه فروشگاه‌ها</option><option v-for="shop in shops" :key="shop.id" :value="shop.id">{{ shop.name }}</option></select>
    </section>
    <div class="scrollbar-none mb-3 flex gap-1 overflow-x-auto rounded-xl border border-black/7 bg-white p-1">
      <button v-for="item in categoryItems" :key="item.value" type="button" class="shrink-0 rounded-lg border-0 px-3 py-2 text-xs font-700 transition" :class="category === item.value ? 'bg-ink text-white' : 'bg-transparent text-muted hover:bg-black/4'" @click="category = item.value">{{ item.label }}</button>
    </div>

    <section class="list-panel">
      <div class="mb-2 px-1 text-xs text-muted">{{ pending ? 'در حال دریافت…' : `${number(filteredLogs.length)} رویداد` }}</div>
      <div v-if="filteredLogs.length" class="list-scroll card overflow-hidden">
        <article v-for="item in filteredLogs" :key="item.id" class="flex gap-3 border-b border-black/6 px-4 py-3.5 last:border-b-0">
          <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl" :class="eventMeta(item.action).tone"><span class="h-4.5 w-4.5" :class="eventMeta(item.action).icon" /></span>
          <div class="min-w-0 flex-1"><strong class="block text-sm">{{ actionLabel(item) }}</strong><div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted"><NuxtLink v-if="item.shopId" :to="`/admin/shops/${item.shopId}`" class="font-700 text-ink/70 no-underline hover:text-brand-700">{{ shopNames[item.shopId] || 'فروشگاه نامشخص' }}</NuxtLink><span v-if="item.actorName">توسط {{ item.actorName }}</span><span>{{ dateTime(item.createdAt) }}</span></div></div>
          <span class="hidden self-center rounded-lg bg-black/[.035] px-2 py-1 text-[10px] text-muted sm:block">{{ entityLabel(item.entityType) }}</span>
        </article>
      </div>
      <AppEmptyState v-else class="card" icon="i-lucide-scroll-text" title="رویدادی با این فیلتر پیدا نشد" description="فروشگاه، دسته‌بندی یا عبارت جست‌وجو را تغییر دهید." />
    </section>
  </div>
</template>
