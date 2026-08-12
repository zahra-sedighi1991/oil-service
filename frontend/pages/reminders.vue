<script setup lang="ts">
import type { ReminderStatus, ServiceReminder, ServiceRemindersResponse } from '~/types/api'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'یادآوری سرویس' })

const api = useApi()
const toast = useToast()
const { number, date, errorMessage } = useFormat()
const activeView = ref<'action' | 'upcoming' | 'history'>('action')
const openingVehicleId = ref<string | null>(null)
const confirmationItem = ref<ServiceReminder | null>(null)
const followUpItem = ref<ServiceReminder | null>(null)
const savingStatus = ref(false)
let confirmationTimer: ReturnType<typeof setTimeout> | undefined

const { data, pending, refresh, error } = await useAsyncData(
  'service-reminders',
  () => api.get<ServiceRemindersResponse>('/service-orders/reminders', { daysAhead: 7 })
)

const items = computed(() => data.value?.items ?? [])
const needsContact = computed(() => items.value.filter(item => item.needsFollowUp || item.reminderStatus === 'no_answer'))
const dueForMessage = computed(() => items.value.filter(item =>
  item.daysUntilDue <= 0
  && !item.needsFollowUp
  && (!item.reminderStatus || ['not_sent', 'later'].includes(item.reminderStatus))
))
const upcomingItems = computed(() => items.value.filter(item =>
  item.daysUntilDue > 0
  && (!item.reminderStatus || ['not_sent', 'later'].includes(item.reminderStatus))
))
const historyItems = computed(() => items.value.filter(item =>
  item.reminderStatus
  && !item.needsFollowUp
  && !['not_sent', 'later', 'no_answer'].includes(item.reminderStatus)
))
const actionItems = computed(() => [...needsContact.value, ...dueForMessage.value]
  .filter((item, index, list) => list.findIndex(candidate => candidate.vehicleId === item.vehicleId) === index))
const visibleItems = computed(() => activeView.value === 'action'
  ? actionItems.value
  : activeView.value === 'upcoming'
    ? upcomingItems.value
    : historyItems.value)

const views = computed(() => [
  { key: 'action' as const, label: 'نیازمند اقدام', count: actionItems.value.length, icon: 'i-lucide-list-checks' },
  { key: 'upcoming' as const, label: '۷ روز آینده', count: upcomingItems.value.length, icon: 'i-lucide-calendar-clock' },
  { key: 'history' as const, label: 'پیگیری‌شده', count: historyItems.value.length, icon: 'i-lucide-history' }
])

function vehicleTitle(item: ServiceReminder) {
  return [item.brandName, item.modelName].filter(Boolean).join(' ') || 'خودرو'
}

function dueLabel(item: ServiceReminder) {
  if (item.daysUntilDue < 0) return `${number(Math.abs(item.daysUntilDue))} روز از موعد گذشته`
  if (item.daysUntilDue === 0) return 'موعد سرویس امروز است'
  return `${number(item.daysUntilDue)} روز تا موعد سرویس`
}

function dueSourceLabel(item: ServiceReminder) {
  if (item.dueSource === 'registered') return item.dueItem ? `موعد ثبت‌شده برای ${item.dueItem}` : 'موعد ثبت‌شده در سرویس'
  if (item.dueSource === 'history') return `برآورد از فاصله سرویس‌های قبلی (${number(item.intervalDays)} روز)`
  return 'بازه پیش‌فرض سه‌ماهه'
}

function workflowLabel(item: ServiceReminder) {
  if (item.needsFollowUp || item.reminderStatus === 'no_answer') return 'نیازمند تماس'
  if (item.reminderStatus === 'sms_sent') return 'منتظر پیگیری'
  if (item.reminderStatus === 'appointment') return 'وقت مراجعه تعیین شد'
  if (item.reminderStatus === 'called') return 'تماس انجام شد'
  if (item.reminderStatus === 'declined') return 'تمایلی ندارد'
  if (item.reminderStatus === 'not_sent') return 'پیامک ارسال نشد'
  if (item.reminderStatus === 'later') return 'موکول‌شده به بعد'
  return item.daysUntilDue <= 0 ? 'آماده ارسال پیامک' : 'موعد نزدیک'
}

function workflowTone(item: ServiceReminder) {
  if (item.needsFollowUp || item.reminderStatus === 'no_answer') return 'border-blue-200 bg-blue-50 text-blue-800'
  if (item.reminderStatus === 'appointment') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  if (item.reminderStatus === 'declined') return 'border-red-100 bg-red-50 text-red-700'
  if (item.reminderStatus === 'called') return 'border-violet-100 bg-violet-50 text-violet-700'
  if (item.reminderStatus === 'sms_sent') return 'border-amber-200 bg-amber-50 text-amber-800'
  return 'border-brand-200 bg-brand-50 text-brand-800'
}

function actionGroup(item: ServiceReminder) {
  return item.needsFollowUp || item.reminderStatus === 'no_answer' ? 'contact' : 'message'
}

function showGroupTitle(item: ServiceReminder, index: number) {
  if (activeView.value !== 'action') return false
  return index === 0 || actionGroup(visibleItems.value[index - 1]) !== actionGroup(item)
}

function emptyTitle() {
  if (activeView.value === 'action') return 'کار عقب‌افتاده‌ای ندارید'
  if (activeView.value === 'upcoming') return 'موعدی در ۷ روز آینده نیست'
  return 'هنوز پیگیری نهایی ثبت نشده است'
}

function emptyDescription() {
  if (activeView.value === 'action') return 'موعدهای رسیده و مشتریان نیازمند تماس اینجا نمایش داده می‌شوند.'
  if (activeView.value === 'upcoming') return 'وقتی موعد مشتری نزدیک شود، برای آماده‌سازی پیامک در این بخش قرار می‌گیرد.'
  return 'نتیجه تماس‌ها، وقت‌های تعیین‌شده و مشتریان بدون تمایل در این بخش نگهداری می‌شوند.'
}

function smsBody(item: ServiceReminder) {
  const customer = item.customerName?.trim() && item.customerName !== 'مشتری بدون نام'
    ? `${item.customerName.trim()} عزیز، `
    : ''
  return `${customer}موعد سرویس ${vehicleTitle(item)} نزدیک است. ${data.value?.shop.name || 'تعویض‌روغنی'}`
}

function smsUrl(item: ServiceReminder) {
  const separator = /iphone|ipad|ipod/i.test(navigator.userAgent) ? '&' : '?'
  const phone = item.mobileNormalized.startsWith('0')
    ? `+98${item.mobileNormalized.slice(1)}`
    : item.mobileNormalized.startsWith('98')
      ? `+${item.mobileNormalized}`
      : item.mobileNormalized
  return `sms:${phone}${separator}body=${encodeURIComponent(smsBody(item))}`
}

function openSms(item: ServiceReminder) {
  if (!import.meta.client || openingVehicleId.value) return
  openingVehicleId.value = item.vehicleId
  item.contactedToday = true
  sessionStorage.setItem('pending-reminder-confirmation', JSON.stringify({
    vehicleId: item.vehicleId,
    openedAt: Date.now()
  }))
  void api.post(`/service-orders/reminders/${item.vehicleId}/sms-opened`).catch(() => {
    item.contactedToday = false
  })
  window.location.href = smsUrl(item)
  clearTimeout(confirmationTimer)
  confirmationTimer = window.setTimeout(() => {
    openingVehicleId.value = null
    confirmationItem.value = item
  }, 1200)
}

async function setStatus(item: ServiceReminder, status: ReminderStatus) {
  if (savingStatus.value) return
  savingStatus.value = true
  try {
    const result = await api.post<{ status: ReminderStatus; recordedAt: string }>(
      `/service-orders/reminders/${item.vehicleId}/status`,
      { status }
    )
    item.reminderStatus = result.status
    item.reminderStatusAt = result.recordedAt
    item.needsFollowUp = status === 'no_answer'
    confirmationItem.value = null
    followUpItem.value = null
    sessionStorage.removeItem('pending-reminder-confirmation')
  } catch (cause) {
    toast.error(errorMessage(cause))
  } finally {
    savingStatus.value = false
  }
}

function deferConfirmation() {
  if (confirmationItem.value) void setStatus(confirmationItem.value, 'later')
}

function restorePendingConfirmation() {
  if (!import.meta.client || confirmationItem.value) return
  const raw = sessionStorage.getItem('pending-reminder-confirmation')
  if (!raw) return
  try {
    const pendingConfirmation = JSON.parse(raw) as { vehicleId: string; openedAt: number }
    if (Date.now() - pendingConfirmation.openedAt < 700) return
    const item = items.value.find(candidate => candidate.vehicleId === pendingConfirmation.vehicleId)
    if (item) confirmationItem.value = item
  } catch {
    sessionStorage.removeItem('pending-reminder-confirmation')
  }
}

onMounted(() => window.addEventListener('focus', restorePendingConfirmation))
onBeforeUnmount(() => {
  window.removeEventListener('focus', restorePendingConfirmation)
  clearTimeout(confirmationTimer)
})
watch(items, restorePendingConfirmation)
</script>

<template>
  <div class="list-page">
    <header class="mb-3 mt-1 flex items-start justify-between gap-3">
      <div>
        <h1 class="m-0 text-xl font-800">پیگیری مشتریان</h1>
        <p class="mb-0 mt-1 text-xs leading-5 text-muted">کارهای امروز، موعدهای نزدیک و نتیجه تماس‌ها در یک نگاه</p>
      </div>
      <button type="button" class="btn-ghost h-10 w-10 shrink-0 p-0" aria-label="به‌روزرسانی" :disabled="pending" @click="refresh()">
        <span class="i-lucide-refresh-cw h-4.5 w-4.5" :class="pending ? 'animate-spin' : ''" />
      </button>
    </header>

    <section class="list-panel gap-3">
      <div class="card p-3">
        <div class="grid grid-cols-3 gap-1.5">
          <button
            v-for="view in views"
            :key="view.key"
            type="button"
            class="relative flex min-w-0 flex-col items-center gap-1 rounded-2xl border px-1.5 py-2.5 text-center transition"
            :class="activeView === view.key ? 'border-brand-300 bg-brand-50 text-ink shadow-sm' : 'border-black/6 bg-black/[.018] text-muted'"
            @click="activeView = view.key"
          >
            <span class="h-4.5 w-4.5" :class="view.icon" />
            <span class="w-full truncate text-[10px] font-750 sm:text-xs">{{ view.label }}</span>
            <strong class="absolute left-1.5 top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[10px] shadow-sm">{{ number(view.count) }}</strong>
          </button>
        </div>

        <div v-if="activeView === 'action' && needsContact.length" class="mt-3 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-[11px] text-blue-800">
          <span class="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white"><span class="i-lucide-phone-call h-4 w-4" /></span>
          <span class="leading-5"><strong>{{ number(needsContact.length) }}</strong> مشتری منتظر تماس یا پیگیری مجدد است.</span>
        </div>
      </div>

      <div v-if="pending" class="scroll-container list-scroll card-stack">
        <div v-for="index in 4" :key="index" class="card h-44 animate-pulse bg-black/[.025]" />
      </div>

      <div v-else-if="visibleItems.length" class="scroll-container list-scroll card-stack pb-1">
        <template v-for="(item, index) in visibleItems" :key="item.vehicleId">
          <div v-if="showGroupTitle(item, index)" class="flex items-center gap-2 px-1 pt-1 text-xs font-800" :class="actionGroup(item) === 'contact' ? 'text-blue-800' : 'text-brand-900'">
            <span class="grid h-7 w-7 place-items-center rounded-lg" :class="actionGroup(item) === 'contact' ? 'bg-blue-50' : 'bg-brand-50'">
              <span class="h-4 w-4" :class="actionGroup(item) === 'contact' ? 'i-lucide-phone-call' : 'i-lucide-message-square-text'" />
            </span>
            <span>{{ actionGroup(item) === 'contact' ? 'تماس و پیگیری' : 'ارسال پیامک موعد' }}</span>
          </div>
        <article class="card overflow-hidden p-0">
          <div class="h-1" :class="item.needsFollowUp || item.reminderStatus === 'no_answer' ? 'bg-blue-500' : item.reminderStatus === 'appointment' ? 'bg-emerald-500' : item.daysUntilDue < 0 ? 'bg-red-400' : 'bg-brand-500'" />
          <div class="p-3.5 sm:p-4">
          <div class="flex items-start gap-3">
            <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl" :class="workflowTone(item)">
              <span class="h-5 w-5" :class="item.needsFollowUp || item.reminderStatus === 'no_answer' ? 'i-lucide-phone-call' : item.reminderStatus === 'appointment' ? 'i-lucide-calendar-check' : 'i-lucide-bell-ring'" />
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <strong class="block truncate text-sm">{{ item.customerName || 'مشتری بدون نام' }}</strong>
                  <span class="mt-0.5 block truncate text-xs text-muted">{{ vehicleTitle(item) }} · {{ item.plateDisplay || item.temporaryIdentifier || 'بدون پلاک' }}</span>
                </div>
                <span class="shrink-0 rounded-lg border px-2 py-1 text-[9px] font-800" :class="workflowTone(item)">{{ workflowLabel(item) }}</span>
              </div>

              <div class="mt-3 rounded-xl border border-black/5 bg-black/[.018] px-3 py-2.5">
                <div class="flex items-center justify-between gap-3">
                  <strong class="text-xs" :class="item.daysUntilDue < 0 ? 'text-danger' : item.daysUntilDue === 0 ? 'text-amber-700' : 'text-ink'">{{ dueLabel(item) }}</strong>
                  <span class="shrink-0 text-[11px] text-muted">{{ date(item.dueDate) }}</span>
                </div>
                <p class="mb-0 mt-1 text-[10px] leading-5 text-muted">{{ dueSourceLabel(item) }}</p>
                <p v-if="item.reminderStatusAt" class="mb-0 mt-0.5 text-[10px] text-muted">آخرین اقدام: {{ date(item.reminderStatusAt) }}</p>
              </div>
            </div>
          </div>

          <div v-if="activeView !== 'history'" class="mt-3 flex items-center gap-2">
            <button v-if="item.needsFollowUp || item.reminderStatus === 'no_answer' || item.reminderStatus === 'sms_sent'" type="button" class="btn-primary min-h-11 flex-1" @click="followUpItem = item">
              <span class="i-lucide-phone-forwarded h-4.5 w-4.5" />
              تماس و ثبت نتیجه
            </button>
            <button v-else type="button" class="btn-primary min-h-11 flex-1" :disabled="openingVehicleId === item.vehicleId" @click="openSms(item)">
              <span class="i-lucide-message-square-text h-4.5 w-4.5" />
              {{ openingVehicleId === item.vehicleId ? 'در حال آماده‌سازی…' : 'آماده‌کردن پیامک' }}
            </button>
            <NuxtLink :to="`/customers/${item.customerId}`" class="btn-ghost h-11 w-11 shrink-0 p-0 no-underline" aria-label="پرونده مشتری">
              <span class="i-lucide-user-round h-4.5 w-4.5" />
            </NuxtLink>
          </div>
          <NuxtLink v-else :to="`/customers/${item.customerId}`" class="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-black/7 text-xs font-750 text-ink no-underline">
            <span class="i-lucide-folder-user h-4 w-4" />مشاهده پرونده مشتری
          </NuxtLink>
          </div>
        </article>
        </template>
      </div>

      <AppEmptyState
        v-else-if="error"
        class="card"
        icon="i-lucide-cloud-off"
        title="دریافت یادآوری‌ها انجام نشد"
        :description="errorMessage(error)"
      >
        <button type="button" class="btn-secondary" @click="refresh()">تلاش دوباره</button>
      </AppEmptyState>

      <AppEmptyState
        v-else
        class="card"
        icon="i-lucide-circle-check-big"
        :title="emptyTitle()"
        :description="emptyDescription()"
      />
    </section>

    <AppModal
      :open="Boolean(confirmationItem)"
      title="آیا پیامک ارسال شد؟"
      description="برنامه پیامک نتیجه ارسال را به روغن‌یار اعلام نمی‌کند؛ لطفاً نتیجه را مشخص کنید."
      @close="deferConfirmation"
    >
      <div v-if="confirmationItem" class="grid gap-2">
        <button type="button" class="btn-primary min-h-12" :disabled="savingStatus" @click="setStatus(confirmationItem, 'sms_sent')">
          <span class="i-lucide-circle-check h-5 w-5" />بله، ارسال شد
        </button>
        <button type="button" class="btn-secondary min-h-12" :disabled="savingStatus" @click="setStatus(confirmationItem, 'not_sent')">
          <span class="i-lucide-circle-x h-5 w-5" />ارسال نشد
        </button>
        <button type="button" class="btn-ghost min-h-11" :disabled="savingStatus" @click="setStatus(confirmationItem, 'later')">
          بعداً پیگیری می‌کنم
        </button>
      </div>
    </AppModal>

    <AppModal
      :open="Boolean(followUpItem)"
      title="نتیجه پیگیری مشتری"
      :description="followUpItem ? `${followUpItem.customerName} · ${vehicleTitle(followUpItem)}` : undefined"
      @close="followUpItem = null"
    >
      <div v-if="followUpItem" class="grid grid-cols-2 gap-2">
        <a :href="`tel:${followUpItem.mobileNormalized}`" class="btn-secondary col-span-2 min-h-12 no-underline">
          <span class="i-lucide-phone h-5 w-5" />تماس با مشتری
        </a>
        <button type="button" class="rounded-xl border border-black/8 bg-white px-3 py-3 text-xs font-750" :disabled="savingStatus" @click="setStatus(followUpItem, 'called')">تماس گرفته شد</button>
        <button type="button" class="rounded-xl border border-black/8 bg-white px-3 py-3 text-xs font-750" :disabled="savingStatus" @click="setStatus(followUpItem, 'no_answer')">بدون پاسخ</button>
        <button type="button" class="col-span-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs font-750 text-emerald-800" :disabled="savingStatus" @click="setStatus(followUpItem, 'appointment')">وقت مراجعه تعیین شد</button>
        <button type="button" class="col-span-2 rounded-xl border border-red-100 bg-red-50 px-3 py-3 text-xs font-750 text-red-700" :disabled="savingStatus" @click="setStatus(followUpItem, 'declined')">تمایلی ندارد</button>
      </div>
    </AppModal>
  </div>
</template>
