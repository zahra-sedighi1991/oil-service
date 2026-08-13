<script setup lang="ts">
import type { VehicleModelOption } from '~/types/api'
import type { ProductEditorValue } from '~/types/product-editor'

const props = withDefaults(defineProps<{
  open: boolean
  title: string
  description?: string
  submitLabel?: string
  saving?: boolean
  enableImage?: boolean
  value?: Partial<ProductEditorValue>
  productTypes: Array<{ id: string; title: string }>
  vehicleModels: VehicleModelOption[]
}>(), {
  description: '',
  submitLabel: 'ذخیره محصول',
  saving: false,
  enableImage: false,
  value: () => ({}),
})

const emit = defineEmits<{
  close: []
  submit: [value: ProductEditorValue]
}>()

const toast = useToast()
const appliesToAllVehicles = ref(true)
const vehicleSearch = ref('')
const imageInput = ref<HTMLInputElement | null>(null)
const imagePreview = ref('')
const selectedImage = ref<File | undefined>()
const removeImage = ref(false)
let localImageUrl = ''
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

const selectedVehicleModels = computed(() => {
  const selectedIds = new Set(form.vehicleModelIds)
  return props.vehicleModels.filter(model => selectedIds.has(model.id))
})

const allFilteredVehiclesSelected = computed(() => filteredVehicleModels.value.length > 0
  && filteredVehicleModels.value.every(model => form.vehicleModelIds.includes(model.id)))

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
  clearLocalImageUrl()
  selectedImage.value = undefined
  removeImage.value = false
  imagePreview.value = props.value.imageUrl || ''
}, { immediate: true, deep: true })

onBeforeUnmount(clearLocalImageUrl)

function clearLocalImageUrl() {
  if (!localImageUrl) return
  URL.revokeObjectURL(localImageUrl)
  localImageUrl = ''
}

function selectImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024) {
    input.value = ''
    toast.error('تصویر باید JPEG، PNG یا WebP و حداکثر ۳ مگابایت باشد.')
    return
  }
  clearLocalImageUrl()
  selectedImage.value = file
  removeImage.value = false
  localImageUrl = URL.createObjectURL(file)
  imagePreview.value = localImageUrl
}

function clearImage() {
  clearLocalImageUrl()
  selectedImage.value = undefined
  removeImage.value = Boolean(props.value.imageUrl)
  imagePreview.value = ''
  if (imageInput.value) imageInput.value.value = ''
}

function toggleVehicle(id: string) {
  const index = form.vehicleModelIds.indexOf(id)
  if (index >= 0) form.vehicleModelIds.splice(index, 1)
  else form.vehicleModelIds.push(id)
}

function toggleFilteredVehicles() {
  const filteredIds = filteredVehicleModels.value.map(model => model.id)
  if (allFilteredVehiclesSelected.value) {
    form.vehicleModelIds = form.vehicleModelIds.filter(id => !filteredIds.includes(id))
    return
  }
  form.vehicleModelIds = [...new Set([...form.vehicleModelIds, ...filteredIds])]
}

function clearVehicleSelection() {
  form.vehicleModelIds = []
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
    ...(props.enableImage ? {
      imageUrl: props.value.imageUrl,
      imageFile: selectedImage.value,
      removeImage: removeImage.value,
    } : {}),
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

      <div v-if="enableImage">
        <label class="label">تصویر محصول <span class="font-400 text-muted">(اختیاری)</span></label>
        <div class="flex items-center gap-3 rounded-2xl border border-black/7 bg-black/[.015] p-3">
          <div class="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-black/7 bg-white">
            <img v-if="imagePreview" :src="imagePreview" alt="پیش‌نمایش محصول" class="h-full w-full object-contain p-1">
            <span v-else class="i-lucide-image h-7 w-7 text-ink/25" />
          </div>
          <div class="min-w-0 flex-1">
            <input ref="imageInput" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="selectImage">
            <div class="flex flex-wrap gap-2">
              <button type="button" class="btn-secondary px-3 py-2" @click="imageInput?.click()">
                <span class="i-lucide-upload h-4 w-4" />{{ imagePreview ? 'تغییر تصویر' : 'انتخاب تصویر' }}
              </button>
              <button v-if="imagePreview" type="button" class="btn-ghost px-3 py-2 text-danger" @click="clearImage">حذف</button>
            </div>
            <small class="mt-2 block leading-5 text-muted">JPEG، PNG یا WebP، حداکثر ۳ مگابایت</small>
          </div>
        </div>
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
            <span class="font-400 text-muted">
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
            <span class="font-400 text-muted">
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

      <!-- سازگاری با خودرو -->
      <fieldset class="rounded-2xl border border-black/7 bg-black/[.015] p-3 sm:p-4">
        <legend class="px-1 text-sm font-800 text-ink">
          سازگاری با خودرو
        </legend>

        <div class="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            class="flex items-center gap-3 rounded-xl border p-3 text-right transition"
            :class="appliesToAllVehicles ? 'border-brand-400 bg-brand-50 text-brand-800 ring-1 ring-brand-100' : 'border-black/7 bg-surface hover:border-black/15'"
            :aria-pressed="appliesToAllVehicles"
            @click="appliesToAllVehicles = true"
          >
            <span
              class="grid h-5 w-5 shrink-0 place-items-center rounded-full border"
              :class="appliesToAllVehicles ? 'border-brand-600 bg-brand-600' : 'border-black/20 bg-white'"
            >
              <span v-if="appliesToAllVehicles" class="h-2 w-2 rounded-full bg-white" />
            </span>
            <span>
              <strong class="block text-sm">همه خودروها</strong>
              <small class="mt-0.5 block text-muted">برای تمام مدل‌ها قابل استفاده است</small>
            </span>
          </button>

          <button
            type="button"
            class="flex items-center gap-3 rounded-xl border p-3 text-right transition"
            :class="!appliesToAllVehicles ? 'border-brand-400 bg-brand-50 text-brand-800 ring-1 ring-brand-100' : 'border-black/7 bg-surface hover:border-black/15'"
            :aria-pressed="!appliesToAllVehicles"
            @click="appliesToAllVehicles = false"
          >
            <span
              class="grid h-5 w-5 shrink-0 place-items-center rounded-full border"
              :class="!appliesToAllVehicles ? 'border-brand-600 bg-brand-600' : 'border-black/20 bg-white'"
            >
              <span v-if="!appliesToAllVehicles" class="h-2 w-2 rounded-full bg-white" />
            </span>
            <span class="min-w-0">
              <strong class="block text-sm">خودروهای مشخص</strong>
              <small class="mt-0.5 block text-muted">
                {{ form.vehicleModelIds.length ? `${form.vehicleModelIds.length} مدل انتخاب شده` : 'یک یا چند مدل را انتخاب کنید' }}
              </small>
            </span>
          </button>
        </div>

        <div v-if="!appliesToAllVehicles" class="mt-4 overflow-hidden rounded-xl border border-black/7 bg-surface">
          <div v-if="selectedVehicleModels.length" class="border-b border-black/7 bg-brand-50/60 p-3">
            <div class="mb-2 flex items-center justify-between gap-3">
              <strong class="text-xs text-brand-800">
                {{ selectedVehicleModels.length }} مدل انتخاب شده
              </strong>
              <button type="button" class="border-0 bg-transparent p-0 text-xs font-700 text-danger" @click="clearVehicleSelection">
                پاک‌کردن همه
              </button>
            </div>
            <div class="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
              <button
                v-for="model in selectedVehicleModels"
                :key="model.id"
                type="button"
                class="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-white px-2.5 py-1 text-xs text-brand-800"
                :aria-label="`حذف ${model.nameFa} از انتخاب‌ها`"
                @click="toggleVehicle(model.id)"
              >
                {{ model.brand?.nameFa ? `${model.brand.nameFa} ${model.nameFa}` : model.nameFa }}
                <span aria-hidden="true" class="text-base leading-none text-brand-500">×</span>
              </button>
            </div>
          </div>

          <div class="border-b border-black/7 p-3">
            <div class="relative">
              <span class="i-lucide-search pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/30" />
              <input
                v-model="vehicleSearch"
                class="field py-2.5 pr-9"
                placeholder="جستجوی برند یا مدل خودرو..."
                autocomplete="off"
              >
              <button
                v-if="vehicleSearch"
                type="button"
                class="absolute left-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full border-0 bg-black/5 text-lg leading-none text-muted"
                aria-label="پاک‌کردن جستجو"
                @click="vehicleSearch = ''"
              >
                ×
              </button>
            </div>

            <div v-if="filteredVehicleModels.length" class="mt-2 flex items-center justify-between gap-3 text-xs">
              <span class="text-muted">{{ filteredVehicleModels.length }} مدل پیدا شد</span>
              <button type="button" class="border-0 bg-transparent p-0 font-700 text-brand-700" @click="toggleFilteredVehicles">
                {{ allFilteredVehiclesSelected ? 'لغو انتخاب نتایج' : 'انتخاب همه نتایج' }}
              </button>
            </div>
          </div>

          <div class="scroll-container max-h-60 overflow-y-auto overscroll-contain p-2">
            <button
              v-for="model in filteredVehicleModels"
              :key="model.id"
              type="button"
              class="mb-1 flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-right transition last:mb-0"
              :class="form.vehicleModelIds.includes(model.id) ? 'border-brand-200 bg-brand-50' : 'border-transparent hover:bg-black/[.03]'"
              @click="toggleVehicle(model.id)"
            >
              <span
                class="grid h-5 w-5 shrink-0 place-items-center rounded-md border"
                :class="form.vehicleModelIds.includes(model.id) ? 'border-brand-500 bg-brand-500 text-ink' : 'border-black/20 bg-white'"
              >
                <span v-if="form.vehicleModelIds.includes(model.id)" class="text-sm font-900 leading-none">✓</span>
              </span>
              <span class="min-w-0 flex-1">
                <strong class="block truncate text-sm">{{ model.nameFa }}</strong>
                <small class="mt-0.5 block truncate text-muted">
                  {{ model.brand?.nameFa || model.nameEn || 'برند نامشخص' }}
                </small>
              </span>
              <span v-if="model.isPopular" class="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-700 text-amber-700">
                پرکاربرد
              </span>
            </button>

            <div v-if="!filteredVehicleModels.length" class="px-3 py-8 text-center">
              <strong class="block text-sm text-muted">مدلی پیدا نشد</strong>
              <span class="mt-1 block text-xs text-muted">نام برند یا مدل دیگری را جستجو کنید.</span>
            </div>
          </div>

          <p v-if="!form.vehicleModelIds.length" class="m-0 border-t border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            برای ادامه حداقل یک مدل خودرو انتخاب کنید.
          </p>
        </div>
      </fieldset>
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
