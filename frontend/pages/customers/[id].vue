<script setup lang="ts">
import type { Customer, VehicleModelOption } from '~/types/api'

definePageMeta({ middleware: 'auth' })
const route = useRoute()
const api = useApi()
const toast = useToast()
const { number, errorMessage } = useFormat()
const showVehicle = ref(false)
const saving = ref(false)
const plateIncomplete = ref(false)
const vehicleForm = reactive({
  modelId: '',
  plate: '',
  lastOdometer: undefined as number | undefined
})
const canCreateVehicle = computed(() => Boolean(
  vehicleForm.modelId && !plateIncomplete.value
))

const { data: customer, refresh } = await useAsyncData(`customer-${route.params.id}`, () => api.get<Customer>(`/customers/${route.params.id}`))
const { data: models } = await useAsyncData(
  `vehicle-models-${route.params.id}`,
  () => api.get<VehicleModelOption[]>('/catalog/vehicle-models')
)

useHead({ title: () => customer.value?.name || 'پرونده مشتری' })

function openVehicleModal() {
  vehicleForm.modelId = ''
  vehicleForm.plate = ''
  plateIncomplete.value = false
  vehicleForm.lastOdometer = undefined
  showVehicle.value = true
}

async function createVehicle() {
  saving.value = true
  try {
    await api.post('/vehicles', {
      ownerCustomerId: route.params.id,
      modelId: vehicleForm.modelId,
      plate: vehicleForm.plate || undefined,
      lastOdometer: vehicleForm.lastOdometer
    })
    showVehicle.value = false
    toast.success('خودرو به پرونده مشتری اضافه شد.')
    await refresh()
  } catch (error) {
    toast.error(errorMessage(error))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="customer">
    <NuxtLink to="/customers" class="mb-5 inline-flex items-center gap-1 text-sm text-ink/50 no-underline hover:text-brand-700"><span class="i-lucide-arrow-right h-4 w-4" />بازگشت به مشتریان</NuxtLink>
    <section class="card mb-5 overflow-hidden">
      <div class="h-24 bg-ink" />
      <div class="-mt-10 flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:px-7">
        <span class="grid h-20 w-20 place-items-center rounded-3xl border-4 border-surface bg-brand-100 text-2xl font-950 text-brand-800">{{ customer.name.slice(0, 1) }}</span>
        <div class="flex-1">
          <h1 class="m-0 text-2xl font-950">{{ customer.name }}</h1>
          <p class="m-0 mt-1 text-sm text-ink/45" dir="ltr">{{ customer.mobileDisplay }}</p>
        </div>
        <button class="btn-primary" @click="openVehicleModal"><span class="i-lucide-car-front h-5 w-5" />افزودن خودرو</button>
      </div>
    </section>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <article v-for="vehicle in customer.vehicles" :key="vehicle.id" class="card p-5">
        <div class="mb-5 flex items-start justify-between">
          <span class="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700"><span class="i-lucide-car h-6 w-6" /></span>
          <span v-if="vehicle.year" class="badge bg-black/4 text-ink/55">{{ vehicle.year }}</span>
        </div>
        <h2 class="m-0 text-lg font-900">{{ vehicle.brand?.nameFa }} {{ vehicle.model?.nameFa }}</h2>
        <p class="mb-0 mt-2 font-800 tracking-wider">{{ vehicle.plateDisplay || vehicle.temporaryIdentifier || 'بدون پلاک' }}</p>
        <div class="mt-5 flex items-center justify-between border-t border-black/6 pt-4 text-sm">
          <span class="text-ink/45">آخرین کیلومتر</span>
          <strong>{{ number(vehicle.lastOdometer) }}</strong>
        </div>
        <NuxtLink :to="`/service-orders/new?customer=${customer.id}&vehicle=${vehicle.id}`" class="btn-secondary mt-4 w-full no-underline"><span class="i-lucide-wrench h-4.5 w-4.5" />ثبت سرویس</NuxtLink>
      </article>
      <button class="min-h-60 rounded-2xl border-2 border-dashed border-black/10 bg-transparent text-ink/40 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700" @click="openVehicleModal">
        <span class="i-lucide-circle-plus mx-auto mb-3 block h-8 w-8" />
        <strong>افزودن خودروی جدید</strong>
      </button>
    </div>

    <AppModal :open="showVehicle" title="افزودن خودرو" description="مدل خودرو را جستجو کنید؛ برند آن به‌صورت خودکار تشخیص داده می‌شود." @close="showVehicle = false">
      <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="createVehicle">
        <VehicleModelPicker v-model="vehicleForm.modelId" :models="models || []" class="sm:col-span-2" />
        <div class="sm:col-span-2"><label class="label">پلاک خودرو <span class="font-400 text-ink/40">(اختیاری)</span></label><IranianPlateInput v-model="vehicleForm.plate" @incomplete-change="plateIncomplete = $event" /></div>
        <div class="sm:col-span-2"><label class="label">کیلومتر فعلی</label><input v-model.number="vehicleForm.lastOdometer" type="number" min="0" class="field"></div>
        <div class="flex justify-end gap-2 pt-2 sm:col-span-2">
          <button type="button" class="btn-ghost" @click="showVehicle = false">انصراف</button>
          <button class="btn-primary" :disabled="saving || !canCreateVehicle">ثبت خودرو</button>
        </div>
      </form>
    </AppModal>
  </div>
</template>
