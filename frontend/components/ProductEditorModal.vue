<script setup lang="ts">
import type { VehicleModelOption } from '~/types/api'

export interface ProductEditorValue {
  productTypeId: string
  name: string
  attributes: Record<string, unknown>
  vehicleModelIds: string[]
}

const props = withDefaults(defineProps<{
  open: boolean
  title: string
  description?: string
  submitLabel?: string
  saving?: boolean
  value?: Partial<ProductEditorValue>
  productTypes: Array<{ id: string; title: string }>
  vehicleModels: VehicleModelOption[]
}>(), {
  description: '',
  submitLabel: 'ذخیره محصول',
  saving: false,
  value: () => ({}),
})

const emit = defineEmits<{
  close: []
  submit: [value: ProductEditorValue]
}>()

const appliesToAllVehicles = ref(true)
const vehicleSearch = ref('')
const form = reactive({
  productTypeId: '',
  name: '',
  productModel: '',
  packageVolume: undefined as number | undefined,
  vehicleModelIds: [] as string[],
})

const filteredVehicleModels = computed(() => {
  const value = vehicleSearch.value.trim().toLocaleLowerCase('fa')
  if (!value) return props.vehicleModels
  return props.vehicleModels.filter(model => [model.nameFa, model.nameEn, model.brand?.nameFa]
    .filter(Boolean).some(label => label!.toLocaleLowerCase('fa').includes(value)))
})

watch(() => [props.open, props.value] as const, ([open]) => {
  if (!open) return
  const attributes = props.value.attributes || {}
  const vehicleModelIds = [...(props.value.vehicleModelIds || [])]
  Object.assign(form, {
    productTypeId: props.value.productTypeId || '',
    name: props.value.name || '',
    productModel: String(attributes.model || ''),
    packageVolume: attributes.package_volume === undefined
      ? undefined
      : Number(attributes.package_volume),
    vehicleModelIds,
  })
  appliesToAllVehicles.value = vehicleModelIds.length === 0
  vehicleSearch.value = ''
}, { immediate: true, deep: true })

function toggleVehicle(id: string) {
  const index = form.vehicleModelIds.indexOf(id)
  if (index >= 0) form.vehicleModelIds.splice(index, 1)
  else form.vehicleModelIds.push(id)
}

function submit() {
  if (!appliesToAllVehicles.value && !form.vehicleModelIds.length) return
  emit('submit', {
    productTypeId: form.productTypeId,
    name: form.name.trim(),
    attributes: Object.fromEntries(Object.entries({
      model: form.productModel.trim() || undefined,
      package_volume: form.packageVolume,
    }).filter(([, value]) => value !== undefined && value !== '')),
    vehicleModelIds: appliesToAllVehicles.value ? [] : [...form.vehicleModelIds],
  })
}
</script>

<template>
  <AppModal
  :open="open"
  :title="title"
  :description="description"
  @close="emit('close')"
>
  <form
    class="flex min-h-0 flex-1 flex-col"
    @submit.prevent="submit"
  >
    <!-- محتوای اسکرولی فرم -->
    <div
      class="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1"
    >
      <div>
        <label class="label">
          نوع محصول
        </label>

        <select
          v-model="form.productTypeId"
          class="field"
          required
        >
          <option
            value=""
            disabled
          >
            انتخاب نوع محصول
          </option>

          <option
            v-for="type in productTypes"
            :key="type.id"
            :value="type.id"
          >
            {{ type.title }}
          </option>
        </select>
      </div>

      <div>
        <label class="label">
          نام کامل محصول
        </label>

        <input
          v-model="form.name"
          class="field"
          required
          placeholder="مثلاً روغن موتور بهران سوپر پیشتاز"
        >
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="label">
            مدل محصول
            <span class="font-400 text-ink/40">
              (اختیاری)
            </span>
          </label>

          <input
            v-model="form.productModel"
            class="field"
            placeholder="مثلاً 10W-40"
          >
        </div>

        <div>
          <label class="label">
            حجم
            <span class="font-400 text-ink/40">
              (اختیاری)
            </span>
          </label>

          <input
            v-model.number="form.packageVolume"
            type="number"
            min="0"
            step="0.1"
            class="field text-left"
            dir="ltr"
            placeholder="مثلاً 4"
          >
        </div>
      </div>

      <!-- نوع خودرو -->
      <div class="rounded-xl border border-black/7 p-3">
        <label class="label">
          نوع خودرو
        </label>

        <div class="grid grid-cols-2 gap-2">
          <label
            class="flex cursor-pointer items-center gap-2 rounded-lg border p-3"
            :class="
              appliesToAllVehicles
                ? 'border-brand-300 bg-brand-50'
                : 'border-black/7'
            "
          >
            <input
              v-model="appliesToAllVehicles"
              type="radio"
              :value="true"
              class="accent-brand-600"
            >

            <span class="text-sm">
              همه خودروها
            </span>
          </label>

          <label
            class="flex cursor-pointer items-center gap-2 rounded-lg border p-3"
            :class="
              !appliesToAllVehicles
                ? 'border-brand-300 bg-brand-50'
                : 'border-black/7'
            "
          >
            <input
              v-model="appliesToAllVehicles"
              type="radio"
              :value="false"
              class="accent-brand-600"
            >

            <span class="text-sm">
              انتخاب یک یا چند خودرو
            </span>
          </label>
        </div>

        <div
          v-if="!appliesToAllVehicles"
          class="mt-3"
        >
          <input
            v-model="vehicleSearch"
            class="field"
            placeholder="جستجوی مدل خودرو..."
          >

          <!-- اسکرول داخلی لیست خودروها -->
          <div
            class="scroll-container mt-2 max-h-52 space-y-1 overflow-y-auto overscroll-contain"
          >
            <label
              v-for="model in filteredVehicleModels"
              :key="model.id"
              class="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 hover:bg-black/[.03]"
            >
              <input
                type="checkbox"
                :checked="form.vehicleModelIds.includes(model.id)"
                class="accent-brand-600"
                @change="toggleVehicle(model.id)"
              >

              <span class="text-sm">
                {{ model.nameFa }}
              </span>
            </label>
          </div>

          <p class="mb-0 mt-2 text-xs text-ink/45">
            {{ form.vehicleModelIds.length }}
            مدل انتخاب شده است.
          </p>

          <p
            v-if="!form.vehicleModelIds.length"
            class="mb-0 mt-1 text-xs text-danger"
          >
            حداقل یک مدل خودرو انتخاب کنید.
          </p>
        </div>
      </div>
    </div>

    <!-- Footer ثابت -->
    <div
      class="shrink-0 border-t border-black/7 bg-surface pt-3"
    >
      <button
        class="btn-primary w-full"
        :disabled="
          saving ||
          (!appliesToAllVehicles && !form.vehicleModelIds.length)
        "
      >
        <span
          v-if="saving"
          class="i-lucide-loader-circle h-4 w-4 animate-spin"
        />

        {{ saving ? 'در حال ذخیره…' : submitLabel }}
      </button>
    </div>
  </form>
</AppModal>
</template>
