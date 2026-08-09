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
  vehicleForm.modelId
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

function formattedOdometer(value: unknown) {
  if (value === '' || value === undefined || value === null) return ''
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? `${number(numericValue)} کیلومتر` : ''
}

async function createVehicle() {
  if (!vehicleForm.modelId) return toast.error('مدل خودرو را انتخاب کنید.')
  if (plateIncomplete.value) return toast.error('پلاک را کامل وارد کنید یا همه بخش‌های آن را خالی بگذارید.')
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
 <section class="space-y-4">
  <!-- Header -->
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div class="min-w-0">
      <div class="flex items-center gap-2">
        <h1 class="m-0 text-lg font-800 text-ink sm:text-xl">
          خودروهای مشتری
        </h1>

        <span
          v-if="customer.vehicles?.length"
          class="text-xs font-700 text-ink/40"
        >
          {{ customer.vehicles.length }} خودرو
        </span>
      </div>

      <p class="mb-0 mt-1 text-xs text-ink/40 sm:text-sm">
        خودروهای ثبت‌شده این مشتری
      </p>
    </div>

    <button
      type="button"
      class="btn-primary flex h-9 shrink-0 items-center justify-center gap-1.5 px-3 text-sm"
      @click="openVehicleModal"
    >
      <span class="i-lucide-plus h-4 w-4" />
      <span>افزودن خودرو</span>
    </button>
  </div>

  <!-- Empty State -->
  <div
    v-if="!customer.vehicles?.length"
    class="card flex min-h-44 flex-col items-center justify-center px-5 py-8 text-center"
  >
    <span
      class="i-lucide-car-front mb-3 h-7 w-7 text-ink/20"
    />

    <h2 class="m-0 text-sm font-800 text-ink">
      هنوز خودرویی ثبت نشده
    </h2>

    <p class="mb-4 mt-1 text-xs text-ink/40">
      اولین خودرو را برای این مشتری اضافه کنید.
    </p>

    <button
      type="button"
      class="btn-primary h-9 px-3 text-sm"
      @click="openVehicleModal"
    >
      <span class="i-lucide-plus h-4 w-4" />
      <span>افزودن خودرو</span>
    </button>
  </div>

  <!-- Vehicles -->
  <div
    v-else
    class="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
  >
    <!-- Vehicle Card -->
    <article
      v-for="vehicle in customer.vehicles"
      :key="vehicle.id"
      class="card flex min-h-[170px] flex-col p-4"
    >
      <!-- Top -->
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span
              class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"
            >
              <span class="i-lucide-car-front h-4.5 w-4.5" />
            </span>

            <div class="min-w-0">
              <h2 class="m-0 truncate text-sm font-800 text-ink">
                {{ vehicle.brand?.nameFa }}
                {{ vehicle.model?.nameFa }}
              </h2>

              <span
                v-if="vehicle.year"
                class="mt-0.5 block text-xs text-ink/35"
              >
                مدل {{ vehicle.year }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Plate -->
      <div class="mt-4">
        <span class="text-[11px] text-ink/35">
          پلاک
        </span>

        <p class="mb-0 mt-0.5 truncate text-sm font-800 tracking-wide text-ink/80">
          {{
            vehicle.plateDisplay ||
            vehicle.temporaryIdentifier ||
            'بدون پلاک'
          }}
        </p>
      </div>

      <!-- Bottom -->
      <div class="mt-auto flex items-end justify-between gap-3 pt-4">
        <div class="min-w-0">
          <span class="block text-[11px] text-ink/35">
            کیلومتر
          </span>

          <strong class="text-sm font-800 text-ink/70">
            {{ number(vehicle.lastOdometer) }}
          </strong>
        </div>

        <NuxtLink
          :to="`/service-orders/new?customer=${customer.id}&vehicle=${vehicle.id}`"
          class="btn-secondary flex h-9 shrink-0 items-center justify-center gap-1.5 px-3 text-xs no-underline"
        >
          <span class="i-lucide-wrench h-3.5 w-3.5" />
          <span>ثبت سرویس</span>
        </NuxtLink>
      </div>
    </article>

    <!-- Add Vehicle -->
    <button
      type="button"
      class="
        flex min-h-[170px]
        items-center justify-center gap-2
        rounded-2xl
        border border-dashed border-black/10
        bg-transparent
        p-4
        text-sm font-700 text-ink/35
        transition
        hover:border-brand-300
        hover:bg-brand-50
        hover:text-brand-700
      "
      @click="openVehicleModal"
    >
      <span class="i-lucide-plus h-5 w-5" />
      <span>افزودن خودروی جدید</span>
    </button>
  </div>

  <!-- Modal -->
  <AppModal
    :open="showVehicle"
    title="افزودن خودرو"
    description="مدل خودرو را جستجو کنید؛ برند آن به‌صورت خودکار تشخیص داده می‌شود."
    @close="showVehicle = false"
  >
    <form
      class="grid grid-cols-1 gap-4 sm:grid-cols-2"
      @submit.prevent="createVehicle"
    >
      <VehicleModelPicker
        v-model="vehicleForm.modelId"
        :models="models || []"
        class="sm:col-span-2"
      />

      <div class="sm:col-span-2">
        <label class="label">
          کیلومتر فعلی
        </label>

        <input
          v-model.number="vehicleForm.lastOdometer"
          type="number"
          min="0"
          inputmode="numeric"
          class="field w-full"
        >

        <p
          v-if="formattedOdometer(vehicleForm.lastOdometer)"
          class="mb-0 mt-1 text-xs text-ink/45"
        >
          {{ formattedOdometer(vehicleForm.lastOdometer) }}
        </p>
      </div>

      <div class="sm:col-span-2">
        <label class="label">
          پلاک خودرو

          <span class="font-400 text-ink/40">
            (اختیاری)
          </span>
        </label>

        <IranianPlateInput
          v-model="vehicleForm.plate"
          @incomplete-change="plateIncomplete = $event"
        />
      </div>

      <div
        class="flex flex-col-reverse gap-2 pt-2 sm:col-span-2 sm:flex-row sm:justify-end"
      >
        <button
          type="button"
          class="btn-ghost"
          @click="showVehicle = false"
        >
          انصراف
        </button>

        <button
          type="submit"
          class="btn-primary"
          :disabled="saving || !canCreateVehicle"
        >
          <span
            v-if="saving"
            class="i-lucide-loader-circle h-4 w-4 animate-spin"
          />

          <span>
            {{ saving ? 'در حال ثبت...' : 'ثبت خودرو' }}
          </span>
        </button>
      </div>
    </form>
  </AppModal>
</section>
</template>
