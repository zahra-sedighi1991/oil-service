<script setup lang="ts">
import type { Invoice, Shop } from '~/types/api'
import type { ServiceShareCardData } from '~/types/share'

definePageMeta({ middleware: 'auth' })
const route = useRoute()
const api = useApi()
const toast = useToast()
const { money, number, dateTime, errorMessage } = useFormat()
const { data: invoice, refresh } = await useAsyncData(`invoice-${route.params.id}`, () => api.get<Invoice>(`/invoices/${route.params.id}`))
const { data: shop } = await useAsyncData('shop-profile', () => api.get<Shop>('/shop/profile'))
const showShare = ref(false)
const showCancel = ref(false)
const preparingShare = ref(false)
const canceling = ref(false)
const cancellationReason = ref('')
const publicToken = ref('')
const publicBookUrl = computed(() => publicToken.value && import.meta.client
  ? `${window.location.origin}/public/service-book/${publicToken.value}`
  : '')
const shareCustomerName = computed(() => {
  const name = invoice.value?.order?.customer?.name?.trim()
  return name && name !== 'مشتری بدون نام' ? name : undefined
})
const shareMessage = computed(() => `دفترچه سرویس خودرو${shareCustomerName.value ? `ی ${shareCustomerName.value}` : ''}`)
const invoiceShareCard = computed<ServiceShareCardData | undefined>(() => {
  const currentInvoice = invoice.value
  const order = currentInvoice?.order
  if (!currentInvoice || !order) return undefined

  const nextDue = [...(order.productLines ?? [])]
    .filter(line => line.dueOdometer !== null && line.dueOdometer !== undefined)
    .sort((a, b) => Number(a.dueOdometer) - Number(b.dueOdometer))[0]

  return {
    shopName: shop.value?.name || 'روغن‌یار',
    shopCity: shop.value?.city,
    shopPhone: shop.value?.publicPhone,
    customerName: shareCustomerName.value,
    odometer: order.odometer,
    nextDueOdometer: nextDue?.dueOdometer ?? undefined,
    nextDueItem: nextDue?.snapshot.displayName || nextDue?.snapshot.description,
    invoiceNo: currentInvoice.invoiceNo,
    totalAmount: Number(currentInvoice.totalAmount),
    currency: currentInvoice.currency || shop.value?.currency,
    serviceDate: order.serviceDate || currentInvoice.issuedAt,
    products: currentInvoice.lines
      .filter(line => line.itemType === 'product')
      .map(line => ({ description: line.descriptionSnapshot, totalAmount: Number(line.total) })),
    services: currentInvoice.lines
      .filter(line => line.itemType === 'service')
      .map(line => ({ description: line.descriptionSnapshot, totalAmount: Number(line.total) }))
  }
})
useHead({ title: () => invoice.value ? `فاکتور ${invoice.value.invoiceNo}` : 'فاکتور' })
function printInvoice() {
  window.print()
}

async function openShare() {
  const vehicleId = invoice.value?.order?.vehicle?.id
  if (!vehicleId) return toast.error('خودروی این فاکتور یافت نشد.')
  preparingShare.value = true
  try {
    if (!publicToken.value) {
      const result = await api.post<{ token: string }>(`/vehicles/${vehicleId}/public-link/share`)
      publicToken.value = result.token
    }
    showShare.value = true
  } catch (error) {
    toast.error(errorMessage(error))
  } finally {
    preparingShare.value = false
  }
}

async function cancelInvoice() {
  const orderId = invoice.value?.order?.id
  const reason = cancellationReason.value.trim()
  if (!orderId) return toast.error('سرویس این فاکتور یافت نشد.')
  if (!reason) return toast.error('دلیل ابطال را وارد کنید.')
  canceling.value = true
  try {
    await api.post(`/service-orders/${orderId}/cancel`, { reason })
    showCancel.value = false
    cancellationReason.value = ''
    toast.success('فاکتور باطل و سابقه کیلومتر خودرو اصلاح شد.')
    await refresh()
  } catch (error) {
    toast.error(errorMessage(error))
  } finally {
    canceling.value = false
  }
}
</script>

<template>
  <div v-if="invoice" class="mx-auto max-w-4xl">
    <div class="mb-5 flex flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
      <NuxtLink to="/invoices" class="inline-flex items-center gap-1 text-sm text-muted no-underline"><span class="i-lucide-arrow-right" />بازگشت</NuxtLink>
      <div class="grid gap-2 sm:flex sm:flex-wrap sm:justify-end" :class="invoice.status === 'issued' ? 'grid-cols-3' : 'grid-cols-1'">
        <button v-if="invoice.status === 'issued'" class="btn-secondary px-2 sm:px-4" :disabled="preparingShare" @click="openShare">
          <span v-if="preparingShare" class="i-lucide-loader-circle h-4 w-4 animate-spin" />
          <span v-else class="i-lucide-share-2 h-4 w-4" />
          {{ preparingShare ? 'آماده…' : 'اشتراک' }}
        </button>
        <button class="btn-secondary px-2 sm:px-4" @click="printInvoice"><span class="i-lucide-printer h-4 w-4" />چاپ</button>
        <button v-if="invoice.status === 'issued'" class="btn-secondary border-red-200 px-2 text-red-700 sm:px-4" @click="showCancel = true"><span class="i-lucide-ban h-4 w-4" />ابطال</button>
      </div>
    </div>
    <article class="card overflow-hidden bg-white">
      <header class="flex flex-col justify-between gap-5 bg-ink p-6 text-white sm:flex-row sm:items-start sm:p-8">
        <div><span class="text-xs text-brand-300">فاکتور سرویس خودرو</span><h1 class="mb-0 mt-2 text-2xl font-800">{{ invoice.invoiceNo }}</h1><p class="mb-0 mt-2 text-sm text-white/70">{{ dateTime(invoice.issuedAt) }}</p></div>
        <span class="badge w-fit bg-white/10 text-white">{{ invoice.status === 'issued' ? 'صادرشده' : 'باطل‌شده' }}</span>
      </header>
      <div class="p-6 sm:p-8">
        <div v-if="invoice.order" class="mb-7 grid gap-3 rounded-2xl bg-black/[.025] p-4 sm:grid-cols-3">
          <div><span class="block text-xs text-muted">مشتری</span><strong class="mt-1 block text-sm">{{ invoice.order.customer?.name }}</strong></div>
          <div><span class="block text-xs text-muted">خودرو</span><strong class="mt-1 block text-sm">{{ invoice.order.vehicle?.brand?.nameFa }} {{ invoice.order.vehicle?.model?.nameFa }}</strong></div>
          <div><span class="block text-xs text-muted">کیلومتر</span><strong class="mt-1 block text-sm">{{ number(invoice.order.odometer) }}</strong></div>
        </div>
        <div class="space-y-2 sm:hidden">
          <article v-for="line in invoice.lines" :key="`mobile-${line.id}`" class="rounded-xl border border-black/7 p-3">
            <div class="flex items-start justify-between gap-3">
              <strong class="text-sm leading-6">{{ line.descriptionSnapshot }}</strong>
              <span class="badge shrink-0 bg-black/5 text-[10px] text-muted">{{ line.itemType === 'product' ? 'محصول' : 'خدمت' }}</span>
            </div>
            <div class="mt-3 flex items-end justify-between gap-3 border-t border-black/5 pt-3">
              <span class="text-xs text-muted">{{ number(line.quantity) }} × {{ money(line.unitPrice, invoice.currency) }}</span>
              <strong class="text-sm text-brand-800">{{ money(line.total, invoice.currency) }}</strong>
            </div>
          </article>
        </div>
        <div class="hidden overflow-x-auto sm:block">
          <table class="w-full border-collapse text-sm">
            <thead><tr class="border-b border-black/10 text-right text-xs text-muted"><th class="py-3 font-700">شرح</th><th class="py-3 font-700">نوع</th><th class="py-3 text-center font-700">تعداد</th><th class="py-3 text-left font-700">قیمت واحد</th><th class="py-3 text-left font-700">مبلغ</th></tr></thead>
            <tbody><tr v-for="line in invoice.lines" :key="line.id" class="border-b border-black/5"><td class="py-4 font-700">{{ line.descriptionSnapshot }}</td><td class="py-4 text-muted">{{ line.itemType === 'product' ? 'محصول' : 'خدمت' }}</td><td class="py-4 text-center">{{ number(line.quantity) }}</td><td class="py-4 text-left">{{ money(line.unitPrice, invoice.currency) }}</td><td class="py-4 text-left font-800">{{ money(line.total, invoice.currency) }}</td></tr></tbody>
          </table>
        </div>
        <div class="mr-auto mt-7 max-w-sm rounded-2xl bg-brand-50 p-5">
          <div v-if="Number(invoice.discountAmount) > 0" class="mb-3 space-y-2 border-b border-brand-200 pb-3 text-sm">
            <div class="flex items-center justify-between text-muted"><span>جمع اقلام</span><span>{{ money(Number(invoice.totalAmount) + Number(invoice.discountAmount), invoice.currency) }}</span></div>
            <div class="flex items-center justify-between text-red-700"><span>تخفیف</span><span>− {{ money(invoice.discountAmount, invoice.currency) }}</span></div>
          </div>
          <div class="flex items-center justify-between"><span class="font-800 text-brand-900">جمع نهایی</span><strong class="text-xl font-800 text-brand-800">{{ money(invoice.totalAmount, invoice.currency) }}</strong></div>
        </div>
      </div>
    </article>
    <PublicBookShareModal
      :open="showShare"
      :url="publicBookUrl"
      :message="shareMessage"
      :card="invoiceShareCard"
      :customer-mobile="invoice.order?.customer?.mobileNormalized"
      @close="showShare = false"
    />
    <AppModal
      :open="showCancel"
      title="ابطال فاکتور"
      description="این فاکتور از سوابق معتبر حذف و کیلومتر خودرو بر اساس آخرین سرویس معتبر اصلاح می‌شود."
      @close="showCancel = false"
    >
      <form class="space-y-4" @submit.prevent="cancelInvoice">
        <div>
          <label class="label">دلیل ابطال</label>
          <textarea v-model="cancellationReason" class="field min-h-24 resize-y" placeholder="مثلاً کیلومتر یا اقلام اشتباه ثبت شده است" required />
        </div>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" class="btn-ghost" :disabled="canceling" @click="showCancel = false">انصراف</button>
          <button class="btn-primary !bg-red-600 hover:!bg-red-700" :disabled="canceling">
            <span v-if="canceling" class="i-lucide-loader-circle h-4 w-4 animate-spin" />
            {{ canceling ? 'در حال ابطال…' : 'تأیید ابطال' }}
          </button>
        </div>
      </form>
    </AppModal>
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
