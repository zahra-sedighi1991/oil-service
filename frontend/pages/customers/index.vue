<script setup lang="ts">
import type { Customer } from '~/types/api'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'مشتریان و خودروها' })

const api = useApi()
const toast = useToast()
const { number, errorMessage } = useFormat()
const search = ref('')
const showCustomer = ref(false)
const saving = ref(false)
const exporting = ref(false)
const form = reactive({ name: '', mobile: '', gender: 'male' as 'male' | 'female', note: '' })
const searchQuery = computed(() => {
  const value = search.value.trim()
  if (!value) return undefined
  return { search: value }
})

const { data: customers, pending, refresh } = await useAsyncData(
  'customers',
  () => api.get<Customer[]>('/customers', searchQuery.value),
  { watch: [search] }
)

async function createCustomer() {
  saving.value = true
  try {
    await api.post('/customers', {
      mobile: form.mobile.trim(),
      gender: form.gender,
      name: form.name.trim() || undefined,
      note: form.note.trim() || undefined
    })
    Object.assign(form, { name: '', mobile: '', gender: 'male', note: '' })
    showCustomer.value = false
    toast.success('مشتری جدید ثبت شد.')
    await refresh()
  } catch (error) {
    toast.error(errorMessage(error))
  } finally {
    saving.value = false
  }
}

function openCustomerModal() {
  Object.assign(form, { name: '', mobile: '', gender: 'male', note: '' })
  showCustomer.value = true
}

async function exportCustomers() {
  exporting.value = true
  try {
    const blob = await api.download('/customers/export')
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `customers-${new Date().toISOString().slice(0, 10)}.xlsx`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    toast.success('فایل Excel مشتریان دانلود شد.')
  } catch (error) {
    toast.error(errorMessage(error))
  } finally {
    exporting.value = false
  }
}
</script>

<template>
<div class="list-page">
  <h1 class="mb-3 mt-1 text-xl font-800">مشتریان و خودروها</h1>
  <!-- Search -->
<section class="card mb-4 p-2">
  <div class="flex flex-col gap-2 sm:flex-row">
    <div class="relative min-w-0 flex-1">
      <span
        class="i-lucide-search absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/30"
      />

      <input
        v-model="search"
        class="field w-full border-0 bg-transparent pr-11 focus:ring-0"
        placeholder="جستجو با نام، شماره موبایل یا پلاک..."
      >
    </div>
    <div class="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
      <button
        type="button"
        class="btn-primary sm:min-w-36"
        @click="openCustomerModal"
      >
        <span class="i-lucide-user-plus h-4.5 w-4.5" />
        <span>مشتری جدید</span>
      </button>
      <button
        type="button"
        class="btn-secondary sm:min-w-36"
        :disabled="exporting"
        @click="exportCustomers"
      >
        <span v-if="exporting" class="i-lucide-loader-circle h-4.5 w-4.5 animate-spin" />
        <span v-else class="i-lucide-file-spreadsheet h-4.5 w-4.5" />
        {{ exporting ? 'در حال ساخت…' : 'خروجی Excel' }}
      </button>
    </div>
  </div>
</section>

<!-- Loading -->
<section v-if="pending" class="list-panel">
  <div class="scroll-container list-scroll">
    <div class="card-stack">
      <div
        v-for="i in 7"
        :key="i"
        class="card flex min-h-[92px] animate-pulse items-center gap-4 px-5 py-4"
      >
        <div class="h-12 w-12 shrink-0 rounded-2xl bg-black/5" />

        <div class="flex-1">
          <div class="mb-2 h-4 w-32 rounded-lg bg-black/5" />
          <div class="h-3 w-24 rounded-lg bg-black/5" />
        </div>

        <div class="hidden h-9 w-24 rounded-xl bg-black/5 sm:block" />

        <div class="hidden gap-2 md:flex">
          <div class="h-10 w-28 rounded-xl bg-black/5" />
          <div class="h-10 w-24 rounded-xl bg-black/5" />
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Customers -->
<section
  v-else-if="customers?.length"
  class="list-panel"
>
  <div class="scroll-container list-scroll">
    <div class="card-stack">
      <article
        v-for="customer in customers"
        :key="customer.id"
        class="
          card-interactive w-full overflow-hidden
        "
      >
        <div
          class="
            flex flex-col gap-3
            px-3.5 py-3
            sm:px-4
            md:flex-row
            md:items-center
            md:gap-4
          "
        >
          <!-- Customer Info -->
          <div class="flex min-w-0 flex-1 items-center gap-3">
            <!-- Avatar -->
            <div
              class="
                grid h-10 w-10 shrink-0
                place-items-center
                rounded-xl
                bg-brand-50
                text-sm font-800 text-brand-700
              "
            >
              {{
                customer.name?.trim()?.slice(0, 1) ||
                'م'
              }}
            </div>

            <!-- Name / Phone -->
            <div class="min-w-0 flex-1">
              <h2
                class="m-0 truncate text-sm font-800 leading-5 text-ink sm:text-base"
              >
                {{ customer.name || 'بدون نام' }}
              </h2>

              <a
                :href="`tel:${customer.mobileNormalized}`"
                class="
                  mt-0.5 block w-fit
                  text-xs text-muted
                  no-underline
                  transition
                  hover:text-brand-700
                  sm:text-sm
                "
                dir="ltr"
              >
                {{ customer.mobileDisplay }}
              </a>

              <div
                v-if="customer.vehicles?.some(vehicle => vehicle.plateDisplay || vehicle.temporaryIdentifier)"
                class="mt-2 flex flex-wrap gap-1.5"
              >
                <span
                  v-for="vehicle in customer.vehicles.filter(item => item.plateDisplay || item.temporaryIdentifier)"
                  :key="vehicle.id"
                  class="inline-flex items-center gap-1 rounded-lg bg-black/[.035] px-2 py-1 text-[11px] font-700 text-muted"
                >
                  <span class="i-lucide-car-front h-3.5 w-3.5 text-brand-600" />
                  {{ vehicle.plateDisplay || vehicle.temporaryIdentifier }}
                </span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div
            class="
              grid grid-cols-2 gap-2
              md:flex
              md:shrink-0
            "
          >
            <NuxtLink
              :to="`/customers/${customer.id}`"
              class="
                btn-secondary
                flex h-9 items-center justify-center
                gap-1.5
                px-3
                text-xs
                no-underline
                sm:text-sm
              "
            >
              <span class="i-lucide-folder-open h-3.5 w-3.5" />
              <span>مشاهده پرونده</span>
            </NuxtLink>

            <NuxtLink
              :to="`/service-orders/new?customer=${customer.id}`"
              class="
                btn-primary
                flex h-9 items-center justify-center
                gap-1.5
                px-3
                text-xs
                no-underline
                sm:text-sm
              "
            >
              <span class="i-lucide-wrench h-3.5 w-3.5" />
              <span>ثبت سرویس</span>
            </NuxtLink>
          </div>
        </div>
      </article>
    </div>
  </div>
</section>

<!-- Empty -->
<section
  v-else
  class="card list-panel"
>
  <AppEmptyState
    icon="i-lucide-users"
    title="مشتری‌ای پیدا نشد"
    description="مشتری جدید بسازید یا عبارت جستجو را تغییر دهید."
  >
    <button
      type="button"
      class="btn-primary"
      @click="openCustomerModal"
    >
      <span class="i-lucide-user-plus h-4.5 w-4.5" />
      <span>ثبت مشتری جدید</span>
    </button>
  </AppEmptyState>
</section>

<!-- New Customer Modal -->
<AppModal
  :open="showCustomer"
  title="مشتری جدید"
  description="اطلاعات پایه مشتری را وارد کنید."
  @close="showCustomer = false"
>
  <form
    class="space-y-4"
    @submit.prevent="createCustomer"
  >
    <!-- Mobile -->
    <div>
      <label class="label">
        شماره موبایل
      </label>

      <input
        v-model="form.mobile"
        class="field w-full text-left"
        dir="ltr"
        inputmode="tel"
        placeholder="09120000000"
        required
        autofocus
      >
    </div>

    <!-- Gender -->
    <div>
      <label class="label">
        جنسیت
      </label>

      <div class="grid grid-cols-2 gap-2">
        <label
          class="
            flex cursor-pointer
            items-center justify-center gap-2
            rounded-xl border p-3
            transition-colors
          "
          :class="
            form.gender === 'male'
              ? 'border-brand-300 bg-brand-50 text-brand-800'
              : 'border-black/7 hover:bg-black/[.02]'
          "
        >
          <input
            v-model="form.gender"
            type="radio"
            value="male"
            class="accent-brand-600"
          >

          <span>آقا</span>
        </label>

        <label
          class="
            flex cursor-pointer
            items-center justify-center gap-2
            rounded-xl border p-3
            transition-colors
          "
          :class="
            form.gender === 'female'
              ? 'border-brand-300 bg-brand-50 text-brand-800'
              : 'border-black/7 hover:bg-black/[.02]'
          "
        >
          <input
            v-model="form.gender"
            type="radio"
            value="female"
            class="accent-brand-600"
          >

          <span>خانم</span>
        </label>
      </div>
    </div>

    <!-- Name -->
    <div>
      <label class="label">
        نام و نام خانوادگی

        <span class="font-400 text-muted">
          (اختیاری)
        </span>
      </label>

      <input
        v-model="form.name"
        class="field w-full"
        placeholder="در صورت تمایل وارد کنید"
      >
    </div>

    <!-- Note -->
    <div>
      <label class="label">
        یادداشت اختیاری
      </label>

      <textarea
        v-model="form.note"
        class="field min-h-24 w-full resize-y"
        placeholder="توضیحات یا یادداشت درباره مشتری..."
      />
    </div>

    <!-- Actions -->
    <div
      class="
        flex flex-col-reverse gap-2 pt-2
        sm:flex-row sm:justify-end
      "
    >
      <button
        type="button"
        class="btn-ghost"
        @click="showCustomer = false"
      >
        انصراف
      </button>

      <button
        type="submit"
        class="btn-primary"
        :disabled="saving"
      >
        <span
          v-if="saving"
          class="i-lucide-loader-circle h-4 w-4 animate-spin"
        />

        <span>
          {{ saving ? 'در حال ثبت...' : 'ثبت مشتری' }}
        </span>
      </button>
    </div>
  </form>
</AppModal>
</div>
</template>
