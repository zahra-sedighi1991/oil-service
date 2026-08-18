<script setup lang="ts">
import type { Product } from '~/types/api'
import type { ProductEditorValue } from '~/types/product-editor'

definePageMeta({ middleware: ['auth', 'admin'] })
useHead({ title: 'کاتالوگ سراسری' })

type TabKey = 'brands' | 'models' | 'types' | 'products' | 'services'
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
  productTypeId?: string
  imageUrl?: string
  isPopular?: boolean
  attributes?: Record<string, unknown>
}
const api = useApi()
const productImageUrl = useProductImageUrl()
const toast = useToast()
const { errorMessage } = useFormat()
const route = useRoute()
const router = useRouter()

const tabKeys: TabKey[] = ['brands', 'models', 'types', 'products', 'services']

function tabFromQuery(value: unknown): TabKey | null {
  const normalizedValue = Array.isArray(value) ? value[0] : value
  return typeof normalizedValue === 'string' && tabKeys.includes(normalizedValue as TabKey)
    ? normalizedValue as TabKey
    : null
}

const tab = ref<TabKey>(tabFromQuery(route.query.tab) || 'brands')
const modal = ref(false)
const saving = ref(false)
const updatingPopularity = ref<string | null>(null)
const editingProduct = ref<Product | null>(null)
const productEditorMode = ref<'create' | 'edit' | null>(null)
const productEditorValue = ref<Partial<ProductEditorValue>>({})
const savingProductEditor = ref(false)
const productSearch = ref('')
const productTypeFilter = ref('')

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'brands', label: 'برند خودرو' },
  { key: 'models', label: 'مدل خودرو' },
  { key: 'types', label: 'انواع محصول' },
  { key: 'products', label: 'محصولات قابل فروش' },
  { key: 'services', label: 'خدمات' }
]

watch(() => route.query.tab, (value) => {
  tab.value = tabFromQuery(value) || 'brands'
})

async function selectTab(key: TabKey) {
  if (tab.value === key && tabFromQuery(route.query.tab) === key) return
  await router.push({
    query: {
      ...route.query,
      tab: key,
    },
  })
}

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

const filteredProducts = computed<Product[]>(() => {
  const search = productSearch.value.trim().toLocaleLowerCase('fa')
  return (products.value || []).filter((product) => {
    if (productTypeFilter.value && product.productTypeId !== productTypeFilter.value) return false
    if (!search) return true
    const type = types.value?.find(candidate => candidate.id === product.productTypeId)
    const searchableText = [
      product.displayName,
      product.name,
      type?.title,
      ...Object.values(product.attributes || {}),
    ].filter(value => value !== undefined && value !== null)
      .join(' ')
      .toLocaleLowerCase('fa')
    return searchableText.includes(search)
  })
})

const items = computed<CatalogRow[]>(() => {
  if (tab.value === 'brands') return brands.value || []
  if (tab.value === 'models') return models.value || []
  if (tab.value === 'types') return types.value || []
  if (tab.value === 'products') return filteredProducts.value as CatalogRow[]
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
    return [
      type?.title,
      item.attributes?.model ? `مدل ${item.attributes.model}` : '',
      item.attributes?.package_volume ? `حجم ${item.attributes.package_volume}` : ''
    ].filter(Boolean).join(' • ') || 'محصول سراسری'
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
  form.isPopular = false
}

function openCreateModal() {
  if (tab.value === 'products') {
    editingProduct.value = null
    productEditorValue.value = {}
    productEditorMode.value = 'create'
    return
  }
  resetForm()
  modal.value = true
}

async function createItem() {
  if (tab.value === 'products') return
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
    } else if (tab.value === 'types') {
      await api.post('/admin/catalog/product-types', {
        key: form.key,
        title: form.title,
        titleTemplate: form.titleTemplate || undefined
      })
      await refreshTypes()
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
    toast.success('اطلاعات پایه با موفقیت ایجاد شد.')
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

async function openProductEditor(product: Product) {
  try {
    const rules = await api.get<Array<{ vehicleModelId: string }>>('/catalog/product-compatibilities', {
      productId: product.id
    })
    productEditorValue.value = {
      productTypeId: product.productTypeId,
      name: product.name || product.displayName,
      attributes: product.attributes || {},
      vehicleModelIds: rules.map(item => item.vehicleModelId),
      imageUrl: productImageUrl(product.imageUrl)
    }
    editingProduct.value = product
    productEditorMode.value = 'edit'
  } catch (error) {
    toast.error(errorMessage(error))
  }
}

function closeProductEditor() {
  if (savingProductEditor.value) return
  productEditorMode.value = null
  editingProduct.value = null
  productEditorValue.value = {}
}

async function saveProduct(value: ProductEditorValue) {
  if (!productEditorMode.value) return
  savingProductEditor.value = true
  try {
    const payload = {
      productTypeId: value.productTypeId,
      name: value.name,
      attributes: value.attributes,
      vehicleModelIds: value.vehicleModelIds,
    }
    let product: Product
    if (productEditorMode.value === 'create') {
      product = await api.post<Product>('/admin/catalog/products', payload)
    } else if (editingProduct.value) {
      product = await api.patch<Product>(`/admin/catalog/products/${editingProduct.value.id}`, payload)
    } else return
    let imageFailed = false
    try {
      if (value.imageFile) {
        const image = new FormData()
        image.append('image', value.imageFile)
        await api.upload(`/admin/catalog/products/${product.id}/image`, image)
      } else if (value.removeImage) {
        await api.delete(`/admin/catalog/products/${product.id}/image`)
      }
    } catch {
      imageFailed = true
    }
    await refreshProducts()
    if (imageFailed) toast.error('اطلاعات محصول ذخیره شد، اما تغییر تصویر انجام نشد. دوباره محصول را ویرایش کنید.')
    else toast.success(productEditorMode.value === 'create'
        ? 'محصول ایجاد شد و اکنون برای قیمت‌گذاری فروشنده در دسترس است.'
        : 'اطلاعات محصول با موفقیت ویرایش شد.')
    productEditorMode.value = null
    editingProduct.value = null
    productEditorValue.value = {}
  } catch (error) {
    toast.error(errorMessage(error))
  } finally {
    savingProductEditor.value = false
  }
}

</script>

<template>
  <div class="list-page">
    <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="mb-0 mt-1 text-2xl font-800">کاتالوگ سراسری</h1>
        <p class="mb-0 mt-2 text-sm text-muted">
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
        :class="tab === item.key ? 'bg-white shadow-sm' : 'bg-transparent text-muted'"
        @click="selectTab(item.key)"
      >
        {{ item.label }}
      </button>
    </div>

    <div v-if="tab === 'products'" class="mb-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
      محصول واقعی را با نام کامل ثبت کنید و مشخص کنید برای همه خودروها یا چند مدل مشخص مناسب است.
    </div>

    <div v-if="tab === 'products'" class="mb-4 grid gap-3 rounded-2xl border border-black/7 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_minmax(220px,0.45fr)]">
      <label class="relative block">
        <span class="i-lucide-search pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          v-model="productSearch"
          type="search"
          class="field pr-10"
          placeholder="جست‌وجوی نام، مدل یا حجم محصول..."
        >
      </label>
      <select v-model="productTypeFilter" class="field">
        <option value="">همه انواع محصول</option>
        <option v-for="type in types || []" :key="type.id" :value="type.id">
          {{ type.title }}
        </option>
      </select>
      <div class="flex items-center justify-between gap-3 text-xs text-muted sm:col-span-2">
        <span>{{ filteredProducts.length }} مورد از {{ products?.length || 0 }} محصول</span>
        <button
          v-if="productSearch || productTypeFilter"
          type="button"
          class="border-0 bg-transparent p-0 font-700 text-brand-700"
          @click="productSearch = ''; productTypeFilter = ''"
        >
          پاک‌کردن فیلترها
        </button>
      </div>
    </div>

    <section class="list-panel">
      <div v-if="items.length" class="scroll-container list-scroll card-stack">
        <div v-for="item in items" :key="item.id" class="card flex items-center justify-between gap-4 px-5 py-4">
          <div class="flex min-w-0 flex-1 items-center gap-3">
            <div v-if="tab === 'products'" class="grid h-13 w-13 shrink-0 place-items-center overflow-hidden rounded-xl border border-black/7 bg-black/[.025]">
              <img v-if="item.imageUrl" :src="productImageUrl(item.imageUrl)" :alt="itemTitle(item)" class="h-full w-full object-contain p-1">
              <span v-else class="i-lucide-package h-5 w-5 text-ink/30" />
            </div>
            <div class="min-w-0 flex-1">
            <strong class="block truncate text-sm">{{ itemTitle(item) }}</strong>
            <span class="mt-1 block truncate text-xs text-muted">{{ itemSubtitle(item) }}</span>
            </div>
          </div>
          <button
            v-if="tab === 'models'"
            type="button"
            class="flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-700 transition"
            :class="item.isPopular ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-black/8 bg-white text-muted hover:border-brand-200'"
            :disabled="updatingPopularity === item.id"
            @click="toggleModelPopularity(item)"
          >
            <span class="i-lucide-star h-4 w-4" :class="item.isPopular ? 'fill-current' : ''" />
            {{ item.isPopular ? 'پراستفاده' : 'عادی' }}
          </button>
          <button
            v-else-if="tab === 'products'"
            type="button"
            class="btn-secondary shrink-0 px-3 py-2"
            @click="openProductEditor(item as Product)"
          >
            <span class="i-lucide-pencil h-4 w-4" />
            ویرایش
          </button>
          <span v-else class="badge shrink-0 bg-brand-50 text-brand-700">فعال</span>
        </div>
      </div>
      <AppEmptyState
        v-else
        class="card"
        :title="tab === 'products' && (productSearch || productTypeFilter) ? 'محصولی با این فیلتر پیدا نشد' : tab === 'products' ? 'هنوز محصول قابل فروشی ایجاد نشده است' : 'رکوردی وجود ندارد'"
        :description="tab === 'products' && (productSearch || productTypeFilter) ? 'عبارت جست‌وجو یا نوع محصول را تغییر دهید.' : tab === 'products' ? 'دکمه رکورد جدید را بزنید و نوع محصول، نام کالا و خودروهای مناسب را انتخاب کنید.' : undefined"
      />
    </section>

   <AppModal
  :open="modal"
  :title="modalTitle"
  @close="modal = false"
>
  <form
    class="flex min-h-0 flex-1 flex-col"
    @submit.prevent="createItem"
  >
    <!-- محتوای اسکرولی -->
    <div
      class="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1"
    >
      <!-- برند خودرو -->
      <template v-if="tab === 'brands'">
        <div>
          <label class="label">
            نام فارسی برند
          </label>

          <input
            v-model="form.nameFa"
            class="field"
            placeholder="مثلاً ایران خودرو"
            required
          >
        </div>

        <div>
          <label class="label">
            نام لاتین
          </label>

          <input
            v-model="form.nameEn"
            class="field text-left"
            dir="ltr"
            placeholder="Iran Khodro"
          >
        </div>

        <div>
          <label class="label">
            کلید فنی
          </label>

          <input
            v-model="form.slug"
            class="field text-left"
            dir="ltr"
            placeholder="iran-khodro"
            required
          >
        </div>
      </template>

      <!-- مدل خودرو -->
      <template v-else-if="tab === 'models'">
        <div>
          <label class="label">
            برند خودرو
          </label>

          <select
            v-model="form.brandId"
            class="field"
            required
          >
            <option
              value=""
              disabled
            >
              انتخاب برند
            </option>

            <option
              v-for="brand in brands || []"
              :key="brand.id"
              :value="brand.id"
            >
              {{ brand.nameFa }}
            </option>
          </select>

          <small
            v-if="!brands?.length"
            class="mt-2 block text-amber-700"
          >
            ابتدا از تب «برند خودرو» یک برند بسازید.
          </small>
        </div>

        <div>
          <label class="label">
            نام فارسی مدل
          </label>

          <input
            v-model="form.nameFa"
            class="field"
            placeholder="مثلاً پژو ۴۰۵"
            required
          >
        </div>

        <div>
          <label class="label">
            نام لاتین
          </label>

          <input
            v-model="form.nameEn"
            class="field text-left"
            dir="ltr"
            placeholder="Peugeot 405"
          >
        </div>

        <div>
          <label class="label">
            کلید فنی
          </label>

          <input
            v-model="form.slug"
            class="field text-left"
            dir="ltr"
            placeholder="peugeot-405"
            required
          >
        </div>

        <label
          class="flex items-center justify-between rounded-xl border border-black/7 p-3"
        >
          <span>
            <strong class="block text-sm">
              مدل پراستفاده
            </strong>

            <small class="text-muted">
              به‌صورت چیپ در فرم افزودن خودرو نمایش داده شود
            </small>
          </span>

          <input
            v-model="form.isPopular"
            type="checkbox"
            class="h-5 w-5 accent-brand-600"
          >
        </label>
      </template>

      <!-- دسته محصول -->
      <template v-else-if="tab === 'types'">
        <div>
          <label class="label">
            عنوان نوع محصول
          </label>

          <input
            v-model="form.title"
            class="field"
            placeholder="مثلاً فیلتر هوا"
            required
          >
        </div>

        <div>
          <label class="label">
            کلید فنی
          </label>

          <input
            v-model="form.key"
            class="field text-left"
            dir="ltr"
            placeholder="air_filter"
            required
          >
        </div>

        <div>
          <label class="label">
            قالب عنوان
            <span class="font-400 text-muted">
              (اختیاری)
            </span>
          </label>

          <input
            v-model="form.titleTemplate"
            class="field"
            placeholder="مثلاً فیلتر هوا"
          >
        </div>
      </template>

      <!-- خدمات -->
      <template v-else-if="tab === 'services'">
        <div>
          <label class="label">
            نام خدمت
          </label>

          <input
            v-model="form.name"
            class="field"
            placeholder="مثلاً تعویض روغن موتور"
            required
          >
        </div>

        <div>
          <label class="label">
            دسته‌بندی
          </label>

          <input
            v-model="form.category"
            class="field"
            placeholder="مثلاً سرویس دوره‌ای"
          >
        </div>

        <div>
          <label class="label">
            توضیحات
          </label>

          <textarea
            v-model="form.description"
            class="field min-h-24 resize-y"
          />
        </div>
      </template>
    </div>

    <!-- Footer ثابت پایین -->
    <div
      class="shrink-0 border-t border-black/7 bg-surface pt-3"
    >
      <button
        class="btn-primary w-full"
        :disabled="saving"
      >
        <span
          v-if="saving"
          class="i-lucide-loader-circle h-4 w-4 animate-spin"
        />

        {{ saving ? 'در حال ذخیره...' : 'ایجاد رکورد' }}
      </button>
    </div>
  </form>
</AppModal>

    <ProductEditorModal
      :open="Boolean(productEditorMode)"
      :title="productEditorMode === 'create' ? 'ایجاد محصول' : `ویرایش ${editingProduct?.displayName || 'محصول'}`"
      :description="productEditorMode === 'create' ? 'نوع، نام، مدل، حجم و خودروهای مناسب محصول را وارد کنید.' : 'نوع، نام، مدل، حجم و خودروهای مناسب محصول را ویرایش کنید.'"
      :submit-label="productEditorMode === 'create' ? 'ایجاد محصول' : 'ذخیره تغییرات'"
      :saving="savingProductEditor"
      enable-image
      :value="productEditorValue"
      :product-types="types || []"
      :vehicle-models="models || []"
      @close="closeProductEditor"
      @submit="saveProduct"
    />
  </div>
</template>
