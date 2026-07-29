<script setup lang="ts">
import type { Product } from '~/types/api'

definePageMeta({ middleware: ['auth', 'admin'] })
useHead({ title: 'کاتالوگ سراسری' })

type TabKey = 'brands' | 'models' | 'manufacturers' | 'types' | 'products' | 'services'
interface CatalogRow {
  id: string
  name?: string
  nameFa?: string
  nameEn?: string
  slug?: string
  key?: string
  title?: string
  displayName?: string
  category?: string
  brandId?: string
  manufacturerId?: string
  productTypeId?: string
  isPopular?: boolean
}

const api = useApi()
const toast = useToast()
const { errorMessage } = useFormat()
const tab = ref<TabKey>('brands')
const modal = ref(false)
const saving = ref(false)
const updatingPopularity = ref<string | null>(null)

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'brands', label: 'برند خودرو' },
  { key: 'models', label: 'مدل خودرو' },
  { key: 'manufacturers', label: 'سازنده محصول' },
  { key: 'types', label: 'دسته‌های محصول' },
  { key: 'products', label: 'محصولات قابل فروش' },
  { key: 'services', label: 'خدمات' }
]

const form = reactive({
  nameFa: '',
  nameEn: '',
  slug: '',
  brandId: '',
  key: '',
  title: '',
  titleTemplate: '',
  name: '',
  category: '',
  description: '',
  productTypeId: '',
  manufacturerId: '',
  isPopular: false
})

const { data: brands, refresh: refreshBrands } = await useAsyncData(
  'admin-catalog-brands',
  () => api.get<CatalogRow[]>('/catalog/vehicle-brands')
)
const { data: models, refresh: refreshModels } = await useAsyncData(
  'admin-catalog-models',
  () => api.get<CatalogRow[]>('/catalog/vehicle-models')
)
const { data: manufacturers, refresh: refreshManufacturers } = await useAsyncData(
  'admin-catalog-manufacturers',
  () => api.get<CatalogRow[]>('/catalog/product-manufacturers')
)
const { data: types, refresh: refreshTypes } = await useAsyncData(
  'admin-catalog-types',
  () => api.get<CatalogRow[]>('/catalog/product-types')
)
const { data: products, refresh: refreshProducts } = await useAsyncData(
  'admin-catalog-products',
  () => api.get<Product[]>('/catalog/products')
)
const { data: services, refresh: refreshServices } = await useAsyncData(
  'admin-catalog-services',
  () => api.get<CatalogRow[]>('/catalog/services')
)

const items = computed<CatalogRow[]>(() => {
  if (tab.value === 'brands') return brands.value || []
  if (tab.value === 'models') return models.value || []
  if (tab.value === 'manufacturers') return manufacturers.value || []
  if (tab.value === 'types') return types.value || []
  if (tab.value === 'products') return (products.value || []) as CatalogRow[]
  return services.value || []
})

const modalTitle = computed(() => {
  const current = tabs.find(item => item.key === tab.value)
  return `ایجاد ${current?.label || 'رکورد'}`
})

function itemTitle(item: CatalogRow) {
  return item.displayName || item.nameFa || item.title || item.name || 'بدون عنوان'
}

function itemSubtitle(item: CatalogRow) {
  if (tab.value === 'models') {
    const brand = brands.value?.find(candidate => candidate.id === item.brandId)
    return brand?.nameFa || item.slug || ''
  }
  if (tab.value === 'products') {
    const type = types.value?.find(candidate => candidate.id === item.productTypeId)
    const manufacturer = manufacturers.value?.find(candidate => candidate.id === item.manufacturerId)
    return [type?.title, manufacturer?.name].filter(Boolean).join(' • ') || 'محصول سراسری'
  }
  return item.slug || item.key || item.category || item.nameEn || ''
}

function resetForm() {
  form.nameFa = ''
  form.nameEn = ''
  form.slug = ''
  form.brandId = ''
  form.key = ''
  form.title = ''
  form.titleTemplate = ''
  form.name = ''
  form.category = ''
  form.description = ''
  form.productTypeId = ''
  form.manufacturerId = ''
  form.isPopular = false
}

function openCreateModal() {
  resetForm()
  modal.value = true
}

async function createItem() {
  saving.value = true
  try {
    if (tab.value === 'brands') {
      await api.post('/admin/catalog/vehicle-brands', {
        nameFa: form.nameFa,
        nameEn: form.nameEn || undefined,
        slug: form.slug
      })
      await refreshBrands()
    } else if (tab.value === 'models') {
      await api.post('/admin/catalog/vehicle-models', {
        brandId: form.brandId,
        nameFa: form.nameFa,
        nameEn: form.nameEn || undefined,
        slug: form.slug,
        isPopular: form.isPopular
      })
      await refreshModels()
    } else if (tab.value === 'manufacturers') {
      await api.post('/admin/catalog/product-manufacturers', { name: form.name })
      await refreshManufacturers()
    } else if (tab.value === 'types') {
      await api.post('/admin/catalog/product-types', {
        key: form.key,
        title: form.title,
        titleTemplate: form.titleTemplate || undefined
      })
      await refreshTypes()
    } else if (tab.value === 'products') {
      await api.post('/admin/catalog/products', {
        productTypeId: form.productTypeId,
        manufacturerId: form.manufacturerId || undefined,
        name: form.name,
        attributes: {}
      })
      await refreshProducts()
    } else {
      await api.post('/admin/catalog/services', {
        name: form.name,
        category: form.category || undefined,
        description: form.description || undefined
      })
      await refreshServices()
    }
    modal.value = false
    resetForm()
    toast.success(tab.value === 'products'
      ? 'محصول ایجاد شد و اکنون برای قیمت‌گذاری فروشنده در دسترس است.'
      : 'اطلاعات پایه با موفقیت ایجاد شد.')
  } catch (error) {
    toast.error(errorMessage(error))
  } finally {
    saving.value = false
  }
}

async function toggleModelPopularity(item: CatalogRow) {
  updatingPopularity.value = item.id
  try {
    await api.patch(`/admin/catalog/vehicle-models/${item.id}/popularity`, {
      isPopular: !item.isPopular
    })
    await refreshModels()
    toast.success(item.isPopular ? 'مدل از فهرست پرکاربردها خارج شد.' : 'مدل به فهرست پرکاربردها اضافه شد.')
  } catch (error) {
    toast.error(errorMessage(error))
  } finally {
    updatingPopularity.value = null
  }
}
</script>

<template>
  <div class="list-page">
    <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="m-0 text-sm font-700 text-brand-700">اطلاعات پایه</p>
        <h1 class="mb-0 mt-1 text-2xl font-950">کاتالوگ سراسری</h1>
        <p class="mb-0 mt-2 text-sm text-ink/45">
          ابتدا دسته‌بندی و سپس محصول واقعی را بسازید تا در پنل فروشنده نمایش داده شود.
        </p>
      </div>
      <button class="btn-primary shrink-0" @click="openCreateModal">
        <span class="i-lucide-plus" />
        رکورد جدید
      </button>
    </header>

    <div class="mb-4 flex flex-wrap gap-1 rounded-xl bg-black/5 p-1">
      <button
        v-for="item in tabs"
        :key="item.key"
        class="rounded-lg border-0 px-3 py-2 text-sm font-700"
        :class="tab === item.key ? 'bg-white shadow-sm' : 'bg-transparent text-ink/45'"
        @click="tab = item.key"
      >
        {{ item.label }}
      </button>
    </div>

    <div v-if="tab === 'products'" class="mb-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
      «دسته محصول» فقط ساختار کلی مانند فیلتر هوا است. اینجا کالای واقعی مثل
      «فیلتر هوا سرکان مناسب پژو ۴۰۵» را ایجاد کنید.
    </div>

    <section class="card list-panel">
      <div v-if="items.length" class="scroll-container list-scroll divide-y divide-black/5">
        <div v-for="item in items" :key="item.id" class="flex items-center justify-between gap-4 px-5 py-4">
          <div class="min-w-0">
            <strong class="block truncate text-sm">{{ itemTitle(item) }}</strong>
            <span class="mt-1 block truncate text-xs text-ink/40">{{ itemSubtitle(item) }}</span>
          </div>
          <button
            v-if="tab === 'models'"
            type="button"
            class="flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-700 transition"
            :class="item.isPopular ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-black/8 bg-white text-ink/45 hover:border-brand-200'"
            :disabled="updatingPopularity === item.id"
            @click="toggleModelPopularity(item)"
          >
            <span class="i-lucide-star h-4 w-4" :class="item.isPopular ? 'fill-current' : ''" />
            {{ item.isPopular ? 'پراستفاده' : 'عادی' }}
          </button>
          <span v-else class="badge shrink-0 bg-brand-50 text-brand-700">فعال</span>
        </div>
      </div>
      <AppEmptyState
        v-else
        :title="tab === 'products' ? 'هنوز محصول قابل فروشی ایجاد نشده است' : 'رکوردی وجود ندارد'"
        :description="tab === 'products' ? 'دکمه رکورد جدید را بزنید و یک دسته محصول و نام کالا انتخاب کنید.' : undefined"
      />
    </section>

    <AppModal :open="modal" :title="modalTitle" @close="modal = false">
      <form class="space-y-4" @submit.prevent="createItem">
        <template v-if="tab === 'brands'">
          <div>
            <label class="label">نام فارسی برند</label>
            <input v-model="form.nameFa" class="field" placeholder="مثلاً ایران خودرو" required>
          </div>
          <div>
            <label class="label">نام لاتین</label>
            <input v-model="form.nameEn" class="field text-left" dir="ltr" placeholder="Iran Khodro">
          </div>
          <div>
            <label class="label">کلید فنی</label>
            <input v-model="form.slug" class="field text-left" dir="ltr" placeholder="iran-khodro" required>
          </div>
        </template>

        <template v-else-if="tab === 'models'">
          <div>
            <label class="label">برند خودرو</label>
            <select v-model="form.brandId" class="field" required>
              <option value="" disabled>انتخاب برند</option>
              <option v-for="brand in brands || []" :key="brand.id" :value="brand.id">
                {{ brand.nameFa }}
              </option>
            </select>
            <small v-if="!brands?.length" class="mt-2 block text-amber-700">
              ابتدا از تب «برند خودرو» یک برند بسازید.
            </small>
          </div>
          <div>
            <label class="label">نام فارسی مدل</label>
            <input v-model="form.nameFa" class="field" placeholder="مثلاً پژو ۴۰۵" required>
          </div>
          <div>
            <label class="label">نام لاتین</label>
            <input v-model="form.nameEn" class="field text-left" dir="ltr" placeholder="Peugeot 405">
          </div>
          <div>
            <label class="label">کلید فنی</label>
            <input v-model="form.slug" class="field text-left" dir="ltr" placeholder="peugeot-405" required>
          </div>
          <label class="flex items-center justify-between rounded-xl border border-black/7 p-3">
            <span>
              <strong class="block text-sm">مدل پراستفاده</strong>
              <small class="text-ink/40">به‌صورت چیپ در فرم افزودن خودرو نمایش داده شود</small>
            </span>
            <input v-model="form.isPopular" type="checkbox" class="h-5 w-5 accent-brand-600">
          </label>
        </template>

        <template v-else-if="tab === 'manufacturers'">
          <div>
            <label class="label">نام سازنده محصول</label>
            <input v-model="form.name" class="field" placeholder="مثلاً سرکان" required>
          </div>
        </template>

        <template v-else-if="tab === 'types'">
          <div>
            <label class="label">عنوان دسته محصول</label>
            <input v-model="form.title" class="field" placeholder="مثلاً فیلتر هوا" required>
          </div>
          <div>
            <label class="label">کلید فنی</label>
            <input v-model="form.key" class="field text-left" dir="ltr" placeholder="air_filter" required>
          </div>
          <div>
            <label class="label">قالب عنوان (اختیاری)</label>
            <input v-model="form.titleTemplate" class="field" placeholder="مثلاً فیلتر هوا">
          </div>
        </template>

        <template v-else-if="tab === 'products'">
          <div>
            <label class="label">دسته محصول</label>
            <select v-model="form.productTypeId" class="field" required>
              <option value="" disabled>انتخاب دسته محصول</option>
              <option v-for="type in types || []" :key="type.id" :value="type.id">
                {{ type.title }}
              </option>
            </select>
            <small v-if="!types?.length" class="mt-2 block text-amber-700">
              ابتدا از تب «دسته‌های محصول» یک دسته بسازید.
            </small>
          </div>
          <div>
            <label class="label">سازنده محصول (اختیاری)</label>
            <select v-model="form.manufacturerId" class="field">
              <option value="">بدون سازنده</option>
              <option v-for="manufacturer in manufacturers || []" :key="manufacturer.id" :value="manufacturer.id">
                {{ manufacturer.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="label">نام کامل محصول</label>
            <input
              v-model="form.name"
              class="field"
              placeholder="مثلاً فیلتر هوا سرکان مناسب پژو ۴۰۵"
              required
            >
            <small class="mt-2 block text-ink/45">
              نام مدل خودرو را نیز در عنوان وارد کنید تا فروشنده بتواند آن را جستجو کند.
            </small>
          </div>
        </template>

        <template v-else>
          <div>
            <label class="label">نام خدمت</label>
            <input v-model="form.name" class="field" placeholder="مثلاً تعویض روغن موتور" required>
          </div>
          <div>
            <label class="label">دسته‌بندی</label>
            <input v-model="form.category" class="field" placeholder="مثلاً سرویس دوره‌ای">
          </div>
          <div>
            <label class="label">توضیحات</label>
            <textarea v-model="form.description" class="field min-h-24 resize-y" />
          </div>
        </template>

        <button class="btn-primary w-full" :disabled="saving">
          {{ saving ? 'در حال ذخیره...' : 'ایجاد رکورد' }}
        </button>
      </form>
    </AppModal>
  </div>
</template>
