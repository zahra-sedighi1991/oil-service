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
const form = reactive({ name: '', mobile: '', gender: 'male' as 'male' | 'female', note: '' })
const searchQuery = computed(() => {
  const value = search.value.trim()
  if (!value) return undefined
  return /^[\d۰-۹٠-٩+\-\s]+$/.test(value) ? { mobile: value } : { search: value }
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
</script>

<template>
  <div class="list-page">
    <header class="mb-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 class="mb-0 mt-1 text-xl font-800">مشتریان و خودروها</h1>
      <button class="btn-primary" @click="openCustomerModal"><span class="i-lucide-user-plus h-5 w-5" />مشتری جدید</button>
    </header>

    <section class="card mb-4">
      <div class="relative">
        <span class="i-lucide-search absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/35" />
        <input v-model="search" class="field border-0 bg-transparent pr-11 focus:ring-0" placeholder="جستجو با نام، شماره موبایل یا پلاک...">
      </div>
    </section>

    <section v-if="pending" class="list-panel">
      <div class="scroll-container list-scroll">
        <div class="grid content-start gap-4 p-1 pb-4 md:grid-cols-2 xl:grid-cols-3">
          <div v-for="i in 6" :key="i" class="card h-48 animate-pulse bg-white/60" />
        </div>
      </div>
    </section>

    <section v-else-if="customers?.length" class="list-panel">
      <div class="scroll-container list-scroll">
        <div class="grid content-start items-start gap-4 p-1 pb-4 md:grid-cols-2 xl:grid-cols-3">
          <article v-for="customer in customers" :key="customer.id" class="card w-full overflow-hidden">
            <div class="flex items-start gap-3 p-5">
              <span class="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 font-700 text-brand-700">{{ customer.name.slice(0, 1) }}</span>
              <div class="min-w-0 flex-1">
                <h2 class="m-0 truncate text-base font-700">{{ customer.name }}</h2>
                <a :href="`tel:${customer.mobileNormalized}`" class="mt-1 block text-sm text-ink/45 no-underline" dir="ltr">{{ customer.mobileDisplay }}</a>
              </div>
              <span class="badge bg-black/4 text-ink/55">{{ number(customer.vehicles?.length) }} خودرو</span>
            </div>
            <div class="border-t border-black/5 bg-black/[.015] px-5 py-4">
              <div v-if="customer.vehicles?.length" class="space-y-2">
                <div v-for="vehicle in customer.vehicles.slice(0, 2)" :key="vehicle.id" class="flex items-center justify-between rounded-xl border border-black/6 bg-white px-3 py-2.5">
                  <div class="flex items-center gap-2">
                    <span class="i-lucide-car-front h-4.5 w-4.5 text-brand-600" />
                    <span class="text-sm font-700">{{ vehicle.plateDisplay || vehicle.temporaryIdentifier || 'بدون پلاک' }}</span>
                  </div>
                  <span class="text-xs text-ink/40">{{ number(vehicle.lastOdometer) }} کیلومتر</span>
                </div>
              </div>
              <p v-else class="my-1 text-center text-xs text-ink/40">هنوز خودرویی برای این مشتری ثبت نشده است.</p>
              <div class="mt-3 grid grid-cols-2 gap-2">
                <NuxtLink :to="`/customers/${customer.id}`" class="btn-secondary py-2 no-underline">مشاهده پرونده</NuxtLink>
                <NuxtLink :to="`/service-orders/new?customer=${customer.id}`" class="btn-ghost py-2 no-underline">ثبت سرویس</NuxtLink>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
    <section v-else class="card list-panel">
      <AppEmptyState icon="i-lucide-users" title="مشتری‌ای پیدا نشد" description="مشتری جدید بسازید یا عبارت جستجو را تغییر دهید.">
        <button class="btn-primary" @click="openCustomerModal">ثبت مشتری جدید</button>
      </AppEmptyState>
    </section>

    <AppModal :open="showCustomer" title="مشتری جدید" description="اطلاعات پایه مشتری را وارد کنید." @close="showCustomer = false">
      <form class="space-y-4" @submit.prevent="createCustomer">
        <div><label class="label">شماره موبایل</label><input v-model="form.mobile" class="field text-left" dir="ltr" inputmode="tel" placeholder="09120000000" required autofocus></div>
        <div>
          <label class="label">جنسیت</label>
          <div class="grid grid-cols-2 gap-2">
            <label class="flex cursor-pointer items-center justify-center gap-2 rounded-xl border p-3" :class="form.gender === 'male' ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-black/7'"><input v-model="form.gender" type="radio" value="male" class="accent-brand-600"> آقا</label>
            <label class="flex cursor-pointer items-center justify-center gap-2 rounded-xl border p-3" :class="form.gender === 'female' ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-black/7'"><input v-model="form.gender" type="radio" value="female" class="accent-brand-600"> خانم</label>
          </div>
        </div>
        <div><label class="label">نام و نام خانوادگی <span class="font-400 text-ink/40">(اختیاری)</span></label><input v-model="form.name" class="field" placeholder="در صورت تمایل وارد کنید"></div>
        <div><label class="label">یادداشت اختیاری</label><textarea v-model="form.note" class="field min-h-24 resize-y" /></div>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="btn-ghost" @click="showCustomer = false">انصراف</button>
          <button class="btn-primary" :disabled="saving"><span v-if="saving" class="i-lucide-loader-circle animate-spin" />ثبت مشتری</button>
        </div>
      </form>
    </AppModal>
  </div>
</template>
