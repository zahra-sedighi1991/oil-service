<script setup lang="ts">
import type { AdminAuditLog, AdminShopDetail, AdminShopStatus, AdminUserStatus } from '~/types/admin'

definePageMeta({ middleware: ['auth', 'admin'] })

const route = useRoute()
const api = useApi()
const toast = useToast()
const { number, money, date, dateTime, errorMessage } = useFormat()
const shopId = String(route.params.id)
const editing = ref(false)
const saving = ref(false)
const form = reactive({ name: '', ownerName: '', publicPhone: '', city: '', address: '', currency: 'TOMAN', timezone: 'Asia/Tehran', invoiceNumberTemplate: '' })

const { data: detail, pending, refresh } = await useAsyncData(`admin-shop-${shopId}`, () => api.get<AdminShopDetail>(`/admin/shops/${shopId}`))
useHead(() => ({ title: detail.value?.shop.name ? `مدیریت ${detail.value.shop.name}` : 'جزئیات فروشگاه' }))

watch(detail, (value) => {
  if (!value) return
  Object.assign(form, {
    name: value.shop.name,
    ownerName: value.shop.ownerName,
    publicPhone: value.shop.publicPhone,
    city: value.shop.city,
    address: value.shop.address || '',
    currency: value.shop.currency,
    timezone: value.shop.timezone,
    invoiceNumberTemplate: value.shop.invoiceNumberTemplate
  })
}, { immediate: true })

const statusMeta: Record<AdminShopStatus, { label: string; class: string }> = {
  active: { label: 'فعال', class: 'bg-emerald-50 text-emerald-700' },
  pending: { label: 'در انتظار تأیید', class: 'bg-amber-50 text-amber-700' },
  suspended: { label: 'تعلیق‌شده', class: 'bg-red-50 text-danger' },
  closed: { label: 'بسته', class: 'bg-black/5 text-muted' }
}
const userStatusMeta: Record<AdminUserStatus, { label: string; class: string }> = {
  active: { label: 'فعال', class: 'bg-emerald-50 text-emerald-700' },
  inactive: { label: 'غیرفعال', class: 'bg-black/5 text-muted' },
  pending_review: { label: 'در انتظار بررسی', class: 'bg-amber-50 text-amber-700' }
}
const actionLabels: Record<string, string> = {
  'admin.shop_updated': 'ویرایش فروشگاه توسط ادمین',
  'admin.shop_user_status_changed': 'تغییر وضعیت کاربر توسط ادمین',
  'shop.updated': 'ویرایش تنظیمات فروشگاه',
  'shop.status_changed': 'تغییر وضعیت فروشگاه',
  'service_reminder.sms_composer_opened': 'بازکردن پیامک یادآوری',
  'suggestion.decided': 'تصمیم‌گیری درباره پیشنهاد',
  'customer.updated': 'ویرایش مشتری',
  'vehicle.owner_transferred': 'انتقال مالک خودرو',
  'public_link.regenerated': 'ساخت دوباره لینک عمومی',
  'public_link.issued_for_sharing': 'اشتراک‌گذاری لینک عمومی',
  'public_link.revoked': 'لغو لینک عمومی',
  'shop_product.configured': 'تغییر تنظیم محصول',
  'shop_service.configured': 'تغییر تنظیم خدمت'
}
const stats = computed(() => detail.value ? [
  { label: 'مشتری', value: detail.value.summary.customers, icon: 'i-lucide-users' },
  { label: 'خودرو', value: detail.value.summary.vehicles, icon: 'i-lucide-car-front' },
  { label: 'کل سرویس', value: detail.value.summary.services, icon: 'i-lucide-wrench' },
  { label: 'سرویس این ماه', value: detail.value.summary.servicesThisMonth, icon: 'i-lucide-calendar-range' },
  { label: 'فاکتور صادرشده', value: detail.value.summary.invoices, icon: 'i-lucide-receipt-text' },
  { label: 'پیش‌نویس باز', value: detail.value.summary.drafts, icon: 'i-lucide-file-clock' }
] : [])

function auditLabel(item: AdminAuditLog) {
  if (item.action.startsWith('service_reminder.status.')) return 'تغییر وضعیت پیگیری یادآوری'
  return actionLabels[item.action] || item.action.replaceAll('.', ' · ')
}
async function changeStatus(status: AdminShopStatus) {
  try {
    await api.patch(`/admin/shops/${shopId}/status`, { status })
    toast.success('وضعیت فروشگاه تغییر کرد.')
    await refresh()
  } catch (error) { toast.error(errorMessage(error)) }
}
async function changeUserStatus(userId: string, status: AdminUserStatus) {
  try {
    await api.patch(`/admin/shops/${shopId}/users/${userId}/status`, { status })
    toast.success('دسترسی کاربر به‌روزرسانی شد.')
    await refresh()
  } catch (error) { toast.error(errorMessage(error)) }
}
async function saveProfile() {
  saving.value = true
  try {
    await api.patch(`/admin/shops/${shopId}`, { ...form, address: form.address || undefined })
    toast.success('اطلاعات فروشگاه ذخیره شد.')
    editing.value = false
    await refresh()
  } catch (error) { toast.error(errorMessage(error)) }
  finally { saving.value = false }
}
function onShopStatusChange(event: Event) {
  changeStatus((event.target as HTMLSelectElement).value as AdminShopStatus)
}
function onUserStatusChange(userId: string, event: Event) {
  changeUserStatus(userId, (event.target as HTMLSelectElement).value as AdminUserStatus)
}
</script>

<template>
  <div class="pb-5">
    <div v-if="pending" class="grid gap-3"><div v-for="index in 4" :key="index" class="card h-24 animate-pulse bg-white/60" /></div>
    <template v-else-if="detail">
      <header class="mb-5">
        <NuxtLink to="/admin/shops" class="mb-3 inline-flex items-center gap-1 text-xs font-700 text-muted no-underline hover:text-ink"><span class="i-lucide-arrow-right h-4 w-4" />بازگشت به فروشگاه‌ها</NuxtLink>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex min-w-0 items-center gap-3"><span class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-500 text-ink shadow-sm"><span class="i-lucide-store h-6 w-6" /></span><div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><h1 class="m-0 truncate text-xl font-900">{{ detail.shop.name }}</h1><span class="badge" :class="statusMeta[detail.shop.status].class">{{ statusMeta[detail.shop.status].label }}</span></div><p class="mb-0 mt-1 text-xs text-muted">مدیریت {{ detail.shop.ownerName }} · عضویت {{ date(detail.shop.createdAt) }}</p></div></div>
          <div class="flex gap-2"><button class="btn-secondary flex-1" type="button" @click="editing = true"><span class="i-lucide-pencil h-4 w-4" />ویرایش مشخصات</button><select :value="detail.shop.status" class="field w-36 py-2.5" aria-label="وضعیت فروشگاه" @change="onShopStatusChange"><option value="pending">در انتظار</option><option value="active">فعال</option><option value="suspended">تعلیق</option><option value="closed">بسته</option></select></div>
        </div>
      </header>

      <section class="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        <article v-for="item in stats" :key="item.label" class="card p-3"><div class="flex items-center justify-between"><span class="h-4.5 w-4.5 text-brand-700" :class="item.icon" /><strong class="text-xl font-900">{{ number(item.value) }}</strong></div><span class="mt-2 block text-xs text-muted">{{ item.label }}</span></article>
      </section>

      <section class="mt-4 grid gap-3 md:grid-cols-3">
        <article class="card bg-ink p-4 text-white"><span class="text-xs text-white/60">درآمد کل ثبت‌شده</span><strong class="mt-2 block text-xl font-900">{{ money(detail.summary.revenue, detail.shop.currency) }}</strong><span class="mt-2 block text-[11px] text-white/55">این ماه: {{ money(detail.summary.revenueThisMonth, detail.shop.currency) }}</span></article>
        <article class="card p-4"><span class="text-xs text-muted">آخرین فعالیت سرویس</span><strong class="mt-2 block text-sm">{{ dateTime(detail.summary.lastServiceAt) }}</strong><span class="mt-2 block text-[11px] text-muted">بر اساس آخرین سرویس تکمیل‌شده</span></article>
        <article class="card p-4"><span class="text-xs text-muted">آمادگی کاتالوگ فروشگاه</span><div class="mt-2 flex items-center gap-4 text-sm"><strong>{{ number(detail.configuration.activeProducts) }} محصول</strong><strong>{{ number(detail.configuration.activeServices) }} خدمت</strong></div><NuxtLink v-if="detail.configuration.pendingSuggestions" to="/admin/suggestions" class="mt-2 inline-flex text-[11px] font-700 text-amber-700 no-underline">{{ number(detail.configuration.pendingSuggestions) }} پیشنهاد در انتظار بررسی</NuxtLink></article>
      </section>

      <div class="mt-5 grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <div class="grid content-start gap-5">
          <section>
            <header class="mb-2 px-1"><h2 class="m-0 text-base font-800">کاربران فروشگاه</h2><p class="m-0 mt-1 text-xs text-muted">فعال یا غیرفعال‌کردن دسترسی بدون نمایش اطلاعات حساس</p></header>
            <div v-if="detail.users.length" class="card divide-y divide-black/6 overflow-hidden">
              <div v-for="item in detail.users" :key="item.id" class="flex items-center gap-3 px-4 py-3"><span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-black/4 text-sm font-900">{{ item.name.slice(0, 1) }}</span><div class="min-w-0 flex-1"><strong class="block truncate text-sm">{{ item.name }}</strong><span dir="ltr" class="mt-0.5 block w-fit text-xs text-muted">{{ item.mobile }}</span></div><span class="badge hidden sm:inline-flex" :class="userStatusMeta[item.status].class">{{ userStatusMeta[item.status].label }}</span><select :value="item.status" class="field w-32 py-1.5" aria-label="وضعیت کاربر" @change="onUserStatusChange(item.id, $event)"><option value="active">فعال</option><option value="inactive">غیرفعال</option><option value="pending_review">در انتظار</option></select></div>
            </div>
            <AppEmptyState v-else class="card" title="کاربری برای فروشگاه ثبت نشده است" />
          </section>

          <section>
            <header class="mb-2 px-1"><h2 class="m-0 text-base font-800">سرویس‌های اخیر</h2><p class="m-0 mt-1 text-xs text-muted">برای ارزیابی سریع فعالیت واقعی فروشگاه</p></header>
            <div v-if="detail.recentServices.length" class="card divide-y divide-black/6 overflow-hidden">
              <div v-for="service in detail.recentServices" :key="service.id" class="grid grid-cols-[1fr_auto] gap-2 px-4 py-3 sm:grid-cols-[1.2fr_1fr_auto] sm:items-center"><div class="min-w-0"><strong class="block truncate text-sm">{{ service.customer?.name || 'مشتری حذف‌شده' }}</strong><span class="mt-0.5 block truncate text-xs text-muted">{{ service.vehicle?.brand?.nameFa }} {{ service.vehicle?.model?.nameFa }} <template v-if="service.vehicle?.plateDisplay">· {{ service.vehicle.plateDisplay }}</template></span></div><div class="hidden text-xs text-muted sm:block">کیلومتر {{ number(service.odometer) }}</div><div class="text-left"><span class="badge" :class="service.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : service.status === 'draft' ? 'bg-amber-50 text-amber-700' : 'bg-black/5 text-muted'">{{ service.status === 'completed' ? 'تکمیل‌شده' : service.status === 'draft' ? 'پیش‌نویس' : 'لغوشده' }}</span><span class="mt-1 block text-[11px] text-muted">{{ date(service.serviceDate) }}</span></div></div>
            </div>
            <AppEmptyState v-else class="card" icon="i-lucide-wrench" title="هنوز سرویسی ثبت نشده است" />
          </section>
        </div>

        <aside class="grid content-start gap-5">
          <section class="card p-4"><h2 class="m-0 text-base font-800">اطلاعات تماس و تنظیمات</h2><dl class="mb-0 mt-4 grid gap-3 text-xs"><div class="flex justify-between gap-3"><dt class="text-muted">تلفن عمومی</dt><dd dir="ltr" class="m-0 font-700">{{ detail.shop.publicPhone }}</dd></div><div class="flex justify-between gap-3"><dt class="text-muted">شهر</dt><dd class="m-0 font-700">{{ detail.shop.city || '—' }}</dd></div><div class="flex justify-between gap-3"><dt class="text-muted">آدرس</dt><dd class="m-0 max-w-52 text-left font-700">{{ detail.shop.address || '—' }}</dd></div><div class="flex justify-between gap-3"><dt class="text-muted">واحد پول</dt><dd class="m-0 font-700">{{ detail.shop.currency === 'TOMAN' ? 'تومان' : 'ریال' }}</dd></div><div class="flex justify-between gap-3"><dt class="text-muted">منطقه زمانی</dt><dd dir="ltr" class="m-0 font-700">{{ detail.shop.timezone }}</dd></div></dl></section>

          <section>
            <header class="mb-2 flex items-center justify-between px-1"><div><h2 class="m-0 text-base font-800">آخرین رویدادها</h2><p class="m-0 mt-1 text-xs text-muted">ردپای تغییرات مهم</p></div><NuxtLink :to="`/admin/activity?shopId=${shopId}`" class="btn-ghost px-2 py-1.5 text-xs no-underline">همه</NuxtLink></header>
            <div v-if="detail.audits.length" class="card divide-y divide-black/6 overflow-hidden"><div v-for="audit in detail.audits.slice(0, 8)" :key="audit.id" class="flex gap-3 px-4 py-3"><span class="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" /><div class="min-w-0"><strong class="block truncate text-xs">{{ auditLabel(audit) }}</strong><span class="mt-1 block text-[11px] text-muted">{{ dateTime(audit.createdAt) }}</span></div></div></div>
            <AppEmptyState v-else class="card" icon="i-lucide-scroll-text" title="رویدادی ثبت نشده است" />
          </section>
        </aside>
      </div>
    </template>
    <AppEmptyState v-else class="card" icon="i-lucide-store-x" title="اطلاعات فروشگاه دریافت نشد" description="ممکن است فروشگاه حذف شده باشد یا دسترسی به آن وجود نداشته باشد.">
      <NuxtLink to="/admin/shops" class="btn-secondary no-underline">بازگشت به فروشگاه‌ها</NuxtLink>
    </AppEmptyState>

    <AppModal :open="editing" title="ویرایش مشخصات فروشگاه" @close="editing = false">
      <form class="grid gap-3 sm:grid-cols-2" @submit.prevent="saveProfile">
        <label><span class="label">نام فروشگاه</span><input v-model="form.name" class="field" required /></label>
        <label><span class="label">نام مدیر</span><input v-model="form.ownerName" class="field" required /></label>
        <label><span class="label">تلفن عمومی</span><input v-model="form.publicPhone" dir="ltr" class="field text-left" required /></label>
        <label><span class="label">شهر</span><input v-model="form.city" class="field" required /></label>
        <label class="sm:col-span-2"><span class="label">آدرس</span><textarea v-model="form.address" class="field min-h-20 resize-y" /></label>
        <label><span class="label">واحد پول</span><select v-model="form.currency" class="field"><option value="TOMAN">تومان</option><option value="IRR">ریال</option></select></label>
        <label><span class="label">منطقه زمانی</span><input v-model="form.timezone" dir="ltr" class="field text-left" required /></label>
        <label class="sm:col-span-2"><span class="label">قالب شماره فاکتور</span><input v-model="form.invoiceNumberTemplate" dir="ltr" class="field text-left" required /></label>
        <div class="mt-2 flex gap-2 sm:col-span-2"><button type="submit" class="btn-primary flex-1" :disabled="saving">{{ saving ? 'در حال ذخیره…' : 'ذخیره تغییرات' }}</button><button type="button" class="btn-secondary" @click="editing = false">انصراف</button></div>
      </form>
    </AppModal>
  </div>
</template>
