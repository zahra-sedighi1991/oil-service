<script setup lang="ts">
import type { CatalogService, Product, VehicleModelOption } from '~/types/api'

interface ProductTypeOption { id: string; title: string }

definePageMeta({ middleware: 'auth' })
useHead({ title: 'کاتالوگ و قیمت‌ها' })

const api = useApi()
const toast = useToast()
const { money, errorMessage } = useFormat()
const tab = ref<'products' | 'services'>('products')
const search = ref('')
const editing = ref<{
  type: 'product' | 'service'
  id: string
  title: string
  value?: number
  defaultIntervalKm?: number
  active: boolean
  favorite: boolean
} | null>(null)
const saving = ref(false)
const movingCard = ref(false)
const showSuggestion = ref(false)
const savingSuggestion = ref(false)
const appliesToAllVehicles = ref(true)
const vehicleSearch = ref('')
const suggestionForm = reactive({
  productTypeId: '',
  name: '',
  productModel: '',
  packageVolume: undefined as number | undefined,
  vehicleModelIds: [] as string[]
})

const { data: products, refresh: refreshProducts } = await useAsyncData('catalog-products', () => api.get<Product[]>('/catalog/products', search.value ? { search: search.value } : undefined), { watch: [search] })
const { data: services, refresh: refreshServices } = await useAsyncData('catalog-services', () => api.get<CatalogService[]>('/catalog/services'))
const { data: productTypes } = await useAsyncData(
  'shop-product-suggestion-types',
  () => api.get<ProductTypeOption[]>('/catalog/product-types')
)
const { data: vehicleModels } = await useAsyncData(
  'shop-product-suggestion-models',
  () => api.get<VehicleModelOption[]>('/catalog/vehicle-models')
)

const filteredVehicleModels = computed(() => {
  const value = vehicleSearch.value.trim().toLocaleLowerCase('fa')
  if (!value) return vehicleModels.value || []
  return (vehicleModels.value || []).filter(model => [model.nameFa, model.nameEn, model.brand?.nameFa]
    .filter(Boolean).some(label => label!.toLocaleLowerCase('fa').includes(value)))
})

function productDefaultIntervalKm(product: Product) {
  const value = Number(
    product.shopConfiguration?.override?.intervalKm
    ?? product.attributes?.interval_km
    ?? product.attributes?.suggested_km
    ?? 0
  )
  return Number.isFinite(value) && value > 0 ? value : undefined
}

function editProduct(product: Product) {
  editing.value = {
    type: 'product', id: product.id, title: product.displayName,
    value: Number(product.shopConfiguration?.salePrice || 0),
    defaultIntervalKm: productDefaultIntervalKm(product),
    active: product.shopConfiguration?.isActive ?? false,
    favorite: product.shopConfiguration?.favorite ?? false
  }
}

function editService(service: CatalogService) {
  editing.value = {
    type: 'service',
    id: service.id,
    title: service.name,
    value: Number(service.shopConfiguration?.fee || 0),
    active: service.shopConfiguration?.isActive ?? true,
    favorite: service.shopConfiguration?.favorite ?? false
  }
}

function canMove(items: Array<Product | CatalogService>, index: number, direction: -1 | 1) {
  const target = items[index + direction]
  return Boolean(target && target.shopConfiguration?.favorite === items[index].shopConfiguration?.favorite)
}

async function moveCard(type: 'product' | 'service', index: number, direction: -1 | 1) {
  const source = type === 'product' ? products.value : services.value
  if (!source || !canMove(source, index, direction) || movingCard.value) return

  const reordered = [...source]
  const targetIndex = index + direction
  ;[reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]]
  movingCard.value = true
  try {
    await Promise.all(reordered.map((item, sortOrder) => api.put(
      type === 'product' ? `/shop-products/${item.id}` : `/shop-services/${item.id}`,
      { sortOrder }
    )))
    if (type === 'product') await refreshProducts()
    else await refreshServices()
  } catch (error) {
    toast.error(errorMessage(error))
  } finally {
    movingCard.value = false
  }
}

async function saveSetting() {
  if (!editing.value) return
  saving.value = true
  try {
    const item = editing.value
    if (item.type === 'product') {
      await api.put(`/shop-products/${item.id}`, {
        salePrice: item.value,
        defaultIntervalKm: item.defaultIntervalKm || 0,
        isActive: item.active,
        favorite: item.favorite
      })
      await refreshProducts()
    } else {
      await api.put(`/shop-services/${item.id}`, { fee: item.value, isActive: item.active, favorite: item.favorite })
      await refreshServices()
    }
    editing.value = null
    toast.success('تنظیمات قیمت ذخیره شد.')
  } catch (error) {
    toast.error(errorMessage(error))
  } finally {
    saving.value = false
  }
}

function openSuggestionModal() {
  Object.assign(suggestionForm, {
    productTypeId: '', name: '', productModel: '', packageVolume: undefined, vehicleModelIds: []
  })
  appliesToAllVehicles.value = true
  vehicleSearch.value = ''
  showSuggestion.value = true
}

function toggleSuggestedVehicle(id: string) {
  const index = suggestionForm.vehicleModelIds.indexOf(id)
  if (index >= 0) suggestionForm.vehicleModelIds.splice(index, 1)
  else suggestionForm.vehicleModelIds.push(id)
}

async function submitProductSuggestion() {
  if (!appliesToAllVehicles.value && !suggestionForm.vehicleModelIds.length) {
    toast.error('حداقل یک مدل خودرو انتخاب کنید یا گزینه همه خودروها را بزنید.')
    return
  }
  savingSuggestion.value = true
  try {
    await api.post('/suggestions', {
      entityType: 'product',
      payload: {
        description: suggestionForm.name.trim(),
        productTypeId: suggestionForm.productTypeId,
        attributes: Object.fromEntries(Object.entries({
          model: suggestionForm.productModel.trim() || undefined,
          package_volume: suggestionForm.packageVolume
        }).filter(([, value]) => value !== undefined && value !== '')),
        vehicleModelIds: appliesToAllVehicles.value ? [] : suggestionForm.vehicleModelIds
      }
    })
    showSuggestion.value = false
    toast.success('پیشنهاد محصول برای بررسی مدیر ثبت شد.')
  } catch (error) {
    toast.error(errorMessage(error))
  } finally {
    savingSuggestion.value = false
  }
}
</script>

<template>
  <div class="list-page">
      <h1 class="mb-3 mt-1 text-xl font-800">محصولات، خدمات و قیمت‌ها</h1>

    <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="inline-flex rounded-xl bg-black/5 p-1">
        <button class="rounded-lg border-0 px-4 py-2 text-sm font-700" :class="tab === 'products' ? 'bg-white text-ink shadow-sm' : 'bg-transparent text-ink/45'" @click="tab = 'products'">محصولات</button>
        <button class="rounded-lg border-0 px-4 py-2 text-sm font-700" :class="tab === 'services' ? 'bg-white text-ink shadow-sm' : 'bg-transparent text-ink/45'" @click="tab = 'services'">خدمات</button>
      </div>
      <div class="flex w-full items-center gap-2 sm:w-auto">
        <div v-if="tab === 'products'" class="relative min-w-0 flex-1 sm:w-80">
          <span class="i-lucide-search absolute right-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ink/30" />
          <input v-model="search" class="field py-2.5 pr-10" placeholder="جستجوی محصول...">
        </div>
        <button
          class="btn-primary shrink-0 px-3 py-2.5"
          @click="openSuggestionModal"
        >
          <span class="i-lucide-lightbulb h-4 w-4" />
          ثبت پیشنهاد محصول
        </button>
      </div>
    </div>

    <section class="card list-panel">
      <div v-if="tab === 'products'" class="flex min-h-0 flex-1 flex-col">
        <div v-if="products?.length" class="scroll-container list-scroll divide-y divide-black/5">
          <div v-for="(product, index) in products" :key="product.id" class="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
            <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><span class="i-lucide-package h-5 w-5" /></span>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <strong class="block truncate text-sm">{{ product.displayName }}</strong>
                <span class="badge text-[10px]" :class="product.shopConfiguration?.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-black/5 text-ink/40'">
                  {{ product.shopConfiguration?.isActive ? 'فعال در فروشگاه' : 'افزوده نشده' }}
                </span>
              </div>
              <span class="mt-1 block truncate text-xs text-ink/40">
                دوره تعویض: {{ productDefaultIntervalKm(product) ? `${productDefaultIntervalKm(product)?.toLocaleString('fa-IR')} کیلومتر` : 'تعیین نشده' }}
                <template v-if="product.attributes?.model"> · مدل {{ product.attributes.model }}</template>
                <template v-if="product.attributes?.package_volume"> · حجم {{ product.attributes.package_volume }}</template>
              </span>
            </div>
            <div class="flex items-center justify-between gap-2 sm:justify-end">
              <strong :class="product.shopConfiguration?.salePrice ? 'text-ink' : 'text-amber-600'">
                {{ product.shopConfiguration?.salePrice ? money(product.shopConfiguration.salePrice) : 'بدون قیمت' }}
              </strong>
              <div class="flex flex-col">
                <button class="btn-ghost h-6 w-7 p-0" :disabled="movingCard || !canMove(products || [], index, -1)" title="انتقال به بالا" aria-label="انتقال به بالا" @click="moveCard('product', index, -1)"><span class="i-lucide-chevron-up h-4 w-4" /></button>
                <button class="btn-ghost h-6 w-7 p-0" :disabled="movingCard || !canMove(products || [], index, 1)" title="انتقال به پایین" aria-label="انتقال به پایین" @click="moveCard('product', index, 1)"><span class="i-lucide-chevron-down h-4 w-4" /></button>
              </div>
              <button class="btn-secondary px-3 py-2" @click="editProduct(product)"><span class="i-lucide-pencil h-4 w-4" />تنظیم</button>
            </div>
          </div>
        </div>
        <AppEmptyState
          v-else
          title="محصولی پیدا نشد"
          description="اگر محصول موردنظرتان وجود ندارد، از دکمه ثبت پیشنهاد محصول استفاده کنید."
        />
      </div>
      <div v-else class="flex min-h-0 flex-1 flex-col">
        <div v-if="services?.length" class="scroll-container list-scroll divide-y divide-black/5">
          <div v-for="(service, index) in services" :key="service.id" class="flex items-center gap-4 px-5 py-4">
            <span class="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-700"><span class="i-lucide-wrench h-5 w-5" /></span>
            <div class="flex-1"><strong class="text-sm">{{ service.name }}</strong><span class="mt-1 block text-xs text-ink/40">{{ service.category || 'خدمت عمومی' }}</span></div>
            <div class="flex flex-col">
              <button class="btn-ghost h-6 w-7 p-0" :disabled="movingCard || !canMove(services || [], index, -1)" title="انتقال به بالا" aria-label="انتقال به بالا" @click="moveCard('service', index, -1)"><span class="i-lucide-chevron-up h-4 w-4" /></button>
              <button class="btn-ghost h-6 w-7 p-0" :disabled="movingCard || !canMove(services || [], index, 1)" title="انتقال به پایین" aria-label="انتقال به پایین" @click="moveCard('service', index, 1)"><span class="i-lucide-chevron-down h-4 w-4" /></button>
            </div>
            <button class="btn-secondary px-3 py-2" @click="editService(service)">تعیین اجرت</button>
          </div>
        </div>
        <AppEmptyState v-else title="خدمتی در کاتالوگ نیست" />
      </div>
    </section>

    <AppModal :open="Boolean(editing)" :title="editing?.title || ''" description="قیمت، دوره تعویض و وضعیت این قلم فقط برای فروشگاه شما اعمال می‌شود." @close="editing = null">
      <form v-if="editing" class="space-y-5" @submit.prevent="saveSetting">
        <div>
          <label class="label">{{ editing.type === 'product' ? 'قیمت فروش' : 'اجرت پیش‌فرض' }} (تومان)</label>
          <input v-model.number="editing.value" type="number" min="0" class="field text-left" dir="ltr" required>
          <p class="mb-0 mt-1 text-left text-xs text-ink/45" dir="rtl">{{ money(editing.value) }}</p>
        </div>
        <div v-if="editing.type === 'product'">
          <label class="label">دوره تعویض پیش‌فرض (کیلومتر)</label>
          <input v-model.number="editing.defaultIntervalKm" type="number" min="0" step="500" class="field text-left" dir="ltr" placeholder="مثلاً 5000">
          <p class="mb-0 mt-2 text-xs leading-5 text-ink/45">هنگام ثبت سفارش خودکار وارد می‌شود و همان‌جا قابل تغییر است.</p>
        </div>
        <label class="flex items-center justify-between rounded-xl border border-black/7 p-3"><span><strong class="block text-sm">فعال در فروشگاه</strong><small class="text-ink/40">برای ثبت سرویس قابل انتخاب باشد</small></span><input v-model="editing.active" type="checkbox" class="h-5 w-5 accent-brand-600"></label>
        <label class="flex items-center justify-between rounded-xl border border-black/7 p-3"><span><strong class="block text-sm">افزودن به محبوب‌ها</strong><small class="text-ink/40">در ابتدای فهرست نمایش داده شود</small></span><input v-model="editing.favorite" type="checkbox" class="h-5 w-5 accent-brand-600"></label>
        <button class="btn-primary w-full" :disabled="saving">ذخیره تنظیمات</button>
      </form>
    </AppModal>

   <AppModal
  :open="showSuggestion"
  title="ثبت پیشنهاد محصول"
  description="مشخصات محصول را وارد کنید؛ پس از تأیید مدیر، محصول برای فروشگاه شما فعال می‌شود."
  @close="showSuggestion = false"
>
  <form
    class="flex min-h-0 flex-1 flex-col"
    @submit.prevent="submitProductSuggestion"
  >
    <!-- محتوای اسکرولی -->
    <div
      class="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1"
    >
      <!-- نوع محصول -->
      <div>
        <label class="label">
          نوع محصول
        </label>

        <select
          v-model="suggestionForm.productTypeId"
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
            v-for="type in productTypes || []"
            :key="type.id"
            :value="type.id"
          >
            {{ type.title }}
          </option>
        </select>
      </div>

      <!-- نام کامل محصول -->
      <div>
        <label class="label">
          نام کامل محصول
        </label>

        <input
          v-model="suggestionForm.name"
          class="field"
          required
          placeholder="مثلاً روغن موتور بهران سوپر پیشتاز"
        >
      </div>

      <!-- مدل و حجم -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="label">
            مدل محصول
            <span class="font-400 text-ink/40">
              (اختیاری)
            </span>
          </label>

          <input
            v-model="suggestionForm.productModel"
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
            v-model.number="suggestionForm.packageVolume"
            type="number"
            min="0"
            step="0.1"
            class="field text-left"
            dir="ltr"
            placeholder="مثلاً 4"
          >
        </div>
      </div>

      <!-- خودروها -->
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

        <!-- انتخاب مدل خودرو -->
        <div
          v-if="!appliesToAllVehicles"
          class="mt-3"
        >
          <input
            v-model="vehicleSearch"
            class="field"
            placeholder="جستجوی مدل خودرو..."
          >

          <!-- اسکرول داخلی لیست خودرو -->
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
                :checked="suggestionForm.vehicleModelIds.includes(model.id)"
                class="accent-brand-600"
                @change="toggleSuggestedVehicle(model.id)"
              >

              <span class="text-sm">
                {{ model.nameFa }}
              </span>
            </label>
          </div>

          <p class="mb-0 mt-2 text-xs text-ink/45">
            {{ suggestionForm.vehicleModelIds.length }}
            مدل انتخاب شده است.
          </p>

          <p
            v-if="!suggestionForm.vehicleModelIds.length"
            class="mb-0 mt-1 text-xs text-danger"
          >
            حداقل یک مدل خودرو انتخاب کنید.
          </p>
        </div>
      </div>
    </div>

    <!-- Footer ثابت پایین -->
    <div
      class="shrink-0 border-t border-black/7 bg-surface pt-3"
    >
      <button
        class="btn-primary w-full"
        :disabled="
          savingSuggestion ||
          (!appliesToAllVehicles &&
            !suggestionForm.vehicleModelIds.length)
        "
      >
        <span
          v-if="savingSuggestion"
          class="i-lucide-loader-circle h-4 w-4 animate-spin"
        />

        {{
          savingSuggestion
            ? 'در حال ثبت…'
            : 'ارسال برای بررسی مدیر'
        }}
      </button>
    </div>
  </form>
</AppModal>
  </div>
</template>
