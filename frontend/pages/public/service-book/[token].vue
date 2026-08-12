<script setup lang="ts">
import { resolveApiBase } from '~/utils/api-base'

interface PublicServiceBook {
  shop: {
    name: string
    phone?: string | null
    city?: string | null
    address?: string | null
  }
  vehicle: {
    brand: string
    model: string
    plate: string
  }
  nextDue: null | {
    dueDate?: string | null
    dueDateItem?: string
    dueOdometer?: number | null
    dueOdometerItem?: string
  }
  services: Array<{
    serviceDate: string
    odometer: number
    totalAmount: number
    currency: string
    products: string[]
    services: string[]
  }>
}

definePageMeta({ layout: false })

const route = useRoute()
const config = useRuntimeConfig()
const { number, money, date } = useFormat()
const { data: book, error } = await useAsyncData(`public-book-${route.params.token}`, () =>
  $fetch<PublicServiceBook>(`/public/v1/service-book/${encodeURIComponent(String(route.params.token))}`, {
    baseURL: resolveApiBase(config.public.publicApiBase)
  })
)

const vehicleTitle = computed(() => book.value
  ? `${book.value.vehicle.brand} ${book.value.vehicle.model}`
  : 'دفترچه سرویس')

useHead({
  title: () => vehicleTitle.value,
  meta: [
    { name: 'robots', content: 'noindex, nofollow, noarchive' },
    { name: 'referrer', content: 'no-referrer' },
    { name: 'theme-color', content: '#F7F6F1' }
  ]
})
</script>

<template>
  <main class="min-h-screen bg-[#F7F6F1] px-3.5 py-4 text-ink sm:px-6 sm:py-8">
    <section v-if="error" class="mx-auto flex min-h-[70vh] max-w-md items-center justify-center">
      <div class="w-full rounded-3xl border border-black/7 bg-white px-6 py-10 text-center shadow-[0_16px_45px_rgba(24,35,30,.06)]">
        <span class="i-lucide-link-2-off mx-auto block h-10 w-10 text-muted" aria-hidden="true" />
        <h1 class="mb-0 mt-5 text-lg font-800">این لینک در دسترس نیست</h1>
        <p class="mx-auto mb-0 mt-2 max-w-xs text-sm leading-7 text-muted">
          ممکن است لینک منقضی یا غیرفعال شده باشد. برای دریافت لینک جدید با مرکز سرویس تماس بگیرید.
        </p>
      </div>
    </section>

    <div v-else-if="book" class="mx-auto max-w-2xl">
      <header class="flex items-center gap-2.5 rounded-2xl border border-black/6 bg-white px-3 py-2.5 shadow-[0_4px_18px_rgba(24,35,30,.035)]">
        <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-900 text-white shadow-sm">
          <span class="i-lucide-droplet h-4.5 w-4.5 text-amber-300" aria-hidden="true" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="m-0 text-[11px] font-700 tracking-wide text-muted">دفترچه سرویس دیجیتال</p>
          <p class="m-0 mt-0.5 truncate text-sm font-800 text-brand-900">{{ book.shop.name }}</p>
          <div class="mt-0.5 flex min-w-0 items-center gap-2 text-[10px] text-muted">
            <span v-if="book.shop.city || book.shop.address" class="flex min-w-0 items-center gap-1">
              <span class="i-lucide-map-pin h-3 w-3 shrink-0" aria-hidden="true" />
              <span class="truncate">{{ [book.shop.city, book.shop.address].filter(Boolean).join('، ') }}</span>
            </span>
            <a
              v-if="book.shop.phone"
              :href="`tel:${book.shop.phone}`"
              class="inline-flex shrink-0 items-center gap-1 font-700 text-brand-700 no-underline"
              dir="ltr"
            >
              <span class="i-lucide-phone h-3 w-3" aria-hidden="true" />
              <span>{{ book.shop.phone }}</span>
            </a>
          </div>
        </div>
      </header>

      <section class="mt-3 overflow-hidden rounded-2xl border border-black/6 bg-white shadow-[0_10px_32px_rgba(24,35,30,.05)]">
        <div class="px-4 py-4 sm:px-5">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="m-0 text-[10px] font-600 text-muted">خودرو</p>
              <h1 class="mb-0 mt-0.5 text-lg font-900 leading-7 sm:text-xl">{{ vehicleTitle }}</h1>
            </div>
            <span class="shrink-0 rounded-lg bg-canvas px-2.5 py-1.5 text-xs font-800 text-ink/75" dir="ltr">
              {{ book.vehicle.plate }}
            </span>
          </div>
        </div>

        <div v-if="book.nextDue" class="border-t border-black/6 bg-brand-50/65 px-4 py-3.5 sm:px-5">
          <div class="mb-2 flex items-center gap-1.5 text-[11px] font-800 text-brand-800">
            <span class="i-lucide-calendar-clock h-4 w-4" aria-hidden="true" />
            <span>موعد بعدی سرویس</span>
          </div>
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div v-if="book.nextDue.dueOdometer" class="flex items-center justify-between gap-3 rounded-xl border border-brand-700/8 bg-white/80 px-3 py-2.5">
              <div class="min-w-0">
                <span class="block text-[10px] text-muted">کیلومتر بعدی</span>
                <span v-if="book.nextDue.dueOdometerItem" class="mt-0.5 block truncate text-[11px] text-muted">{{ book.nextDue.dueOdometerItem }}</span>
              </div>
              <strong class="shrink-0 text-sm font-900 text-brand-900">{{ number(book.nextDue.dueOdometer) }}</strong>
            </div>
            <div v-if="book.nextDue.dueDate" class="flex items-center justify-between gap-3 rounded-xl border border-brand-700/8 bg-white/80 px-3 py-2.5">
              <div class="min-w-0">
                <span class="block text-[10px] text-muted">تاریخ بعدی</span>
                <span v-if="book.nextDue.dueDateItem" class="mt-0.5 block truncate text-[11px] text-muted">{{ book.nextDue.dueDateItem }}</span>
              </div>
              <strong class="shrink-0 text-sm font-900 text-brand-900">{{ date(book.nextDue.dueDate) }}</strong>
            </div>
          </div>
        </div>
      </section>

      <section class="mt-5" aria-labelledby="service-history-title">
        <div class="mb-2.5 flex items-center justify-between px-1">
          <h2 id="service-history-title" class="m-0 text-sm font-900">سوابق سرویس</h2>
          <span v-if="book.services.length" class="text-xs font-600 text-muted">{{ number(book.services.length) }} سرویس</span>
        </div>

        <div v-if="book.services.length" class="space-y-2">
          <article
            v-for="(service, serviceIndex) in book.services"
            :key="`${service.serviceDate}-${serviceIndex}`"
            class="rounded-xl border border-black/6 bg-white px-3.5 py-3 shadow-[0_3px_14px_rgba(24,35,30,.03)] sm:px-4"
          >
            <div class="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                <time :datetime="service.serviceDate" class="text-xs font-800">{{ date(service.serviceDate) }}</time>
                <span class="inline-flex items-center gap-1 text-[11px] font-600 text-muted">
                  <span class="i-lucide-gauge h-3.5 w-3.5" aria-hidden="true" />
                  {{ number(service.odometer) }} کیلومتر
                </span>
              </div>
              <strong class="text-xs font-900 text-brand-800">{{ money(service.totalAmount, service.currency) }}</strong>
            </div>

            <ul class="mb-0 mt-2 flex list-none flex-wrap gap-1.5 border-t border-black/5 p-0 pt-2">
              <li v-for="(item, itemIndex) in service.products" :key="`product-${itemIndex}`" class="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2 py-1 text-[11px] leading-5 text-ink/80">
                <span class="i-lucide-package-check h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden="true" />
                <span>{{ item }}</span>
              </li>
              <li v-for="(item, itemIndex) in service.services" :key="`service-${itemIndex}`" class="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[11px] leading-5 text-ink/80">
                <span class="i-lucide-wrench h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
                <span>{{ item }}</span>
              </li>
            </ul>
          </article>
        </div>

        <div v-else class="rounded-2xl border border-dashed border-black/10 bg-white/55 px-5 py-8 text-center">
          <span class="i-lucide-notebook-tabs mx-auto block h-8 w-8 text-muted/55" aria-hidden="true" />
          <p class="mb-0 mt-3 text-sm font-700">هنوز سابقه‌ای ثبت نشده است</p>
        </div>
      </section>

      <p class="mb-0 mt-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-[9px] leading-4 text-muted/65">
        برای حفظ حریم خصوصی، پلاک خودرو به‌صورت ناقص نمایش داده می‌شود.
      </p>
    </div>
  </main>
</template>
