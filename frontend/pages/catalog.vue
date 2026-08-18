<script setup lang="ts">
import type { CatalogService, Product, Shop, VehicleModelOption } from '~/types/api'
import type { ProductEditorValue } from '~/types/product-editor'

interface ProductTypeOption { id: string; title: string }

definePageMeta({ middleware: 'auth' })
useHead({ title: 'کاتالوگ و قیمت‌ها' })

const api = useApi()
const route = useRoute()
const productImageUrl = useProductImageUrl()
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
const suggestionValue = ref<Partial<ProductEditorValue>>({})
const productRail = ref<HTMLElement | null>(null)

const { data: products, refresh: refreshProducts } = await useAsyncData('catalog-products', () => api.get<Product[]>('/catalog/products', search.value ? { search: search.value } : undefined), { watch: [search] })
const { data: catalogProducts, refresh: refreshCatalogProducts } = await useAsyncData('catalog-products-summary', () => api.get<Product[]>('/catalog/products'))
const { data: services, refresh: refreshServices } = await useAsyncData('catalog-services', () => api.get<CatalogService[]>('/catalog/services'))
const { data: shop } = await useAsyncData('shop-profile', () => api.get<Shop>('/shop/profile'))
const shopCurrency = computed(() => shop.value?.currency || 'TOMAN')
const currencyLabel = computed(() => shopCurrency.value === 'IRR' ? 'ریال' : 'تومان')
const { data: productTypes } = await useAsyncData(
  'shop-product-suggestion-types',
  () => api.get<ProductTypeOption[]>('/catalog/product-types')
)
const { data: vehicleModels } = await useAsyncData(
  'shop-product-suggestion-models',
  () => api.get<VehicleModelOption[]>('/catalog/vehicle-models')
)

function isProductReady(product: Product) {
  return Boolean(product.shopConfiguration?.isActive && Number(product.shopConfiguration.salePrice || 0) > 0)
}

const readyProductCount = computed(() => (catalogProducts.value || []).filter(isProductReady).length)
const productsNeedingSetup = computed(() => (catalogProducts.value || []).filter(product => !isProductReady(product)))
const catalogIsReady = computed(() => Boolean(catalogProducts.value?.length) && productsNeedingSetup.value.length === 0)

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
  if (editing.value.type === 'product' && editing.value.active && Number(editing.value.value || 0) <= 0) {
    toast.error('برای فعال‌کردن محصول، ابتدا قیمت فروش را وارد کنید.')
    return
  }
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
      await Promise.all([refreshProducts(), refreshCatalogProducts()])
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

async function startProductSetup() {
  tab.value = 'products'
  search.value = ''
  await nextTick()
  productRail.value?.scrollTo({ left: 0, behavior: 'smooth' })
  const firstProduct = productsNeedingSetup.value[0]
  if (firstProduct) editProduct(firstProduct)
}

function scrollProductRail(direction: -1 | 1) {
  const rail = productRail.value
  if (!rail) return
  rail.scrollBy({ left: direction * rail.clientWidth * 0.8, behavior: 'smooth' })
}

onMounted(() => {
  if (route.query.setup === '1' && productsNeedingSetup.value.length) startProductSetup()
})

function openSuggestionModal() {
  suggestionValue.value = {}
  showSuggestion.value = true
}

async function submitProductSuggestion(value: ProductEditorValue) {
  savingSuggestion.value = true
  try {
    await api.post('/suggestions', {
      entityType: 'product',
      payload: {
        description: value.name,
        productTypeId: value.productTypeId,
        attributes: value.attributes,
        vehicleModelIds: value.vehicleModelIds
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

    <section
      v-if="catalogProducts?.length"
      class="mb-4 rounded-2xl border p-4 sm:p-5"
      :class="catalogIsReady ? 'border-emerald-200 bg-emerald-50/70' : 'border-amber-300 bg-amber-50'"
    >
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-start gap-3">
          <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white shadow-sm" :class="catalogIsReady ? 'text-emerald-700' : 'text-amber-700'">
            <span class="h-5.5 w-5.5" :class="catalogIsReady ? 'i-lucide-circle-check-big' : 'i-lucide-badge-alert'" />
          </span>
          <div>
            <strong class="block text-base">{{ catalogIsReady ? 'کاتالوگ فروشگاه آماده است' : 'قیمت محصولات را تکمیل و سپس فعال کنید' }}</strong>
            <p class="mb-0 mt-1 text-xs leading-6 text-ink/65">
              <template v-if="catalogIsReady">همه محصولات قیمت دارند و برای ثبت سرویس فعال شده‌اند.</template>
              <template v-else>۱. قیمت فروش را وارد کنید &nbsp; ۲. گزینه «فعال در فروشگاه» را روشن کنید.</template>
            </p>
            <div class="mt-2 flex flex-wrap gap-2 text-[11px] font-700">
              <span class="rounded-full bg-white px-2.5 py-1 text-emerald-700">{{ readyProductCount.toLocaleString('fa-IR') }} محصول آماده</span>
              <span v-if="productsNeedingSetup.length" class="rounded-full bg-white px-2.5 py-1 text-amber-700">{{ productsNeedingSetup.length.toLocaleString('fa-IR') }} محصول نیازمند تکمیل</span>
            </div>
          </div>
        </div>
        <button v-if="!catalogIsReady" type="button" class="btn-primary w-full shrink-0 sm:w-auto" @click="startProductSetup">
          <span class="i-lucide-tags h-4.5 w-4.5" />
          شروع قیمت‌گذاری
        </button>
      </div>
    </section>

    <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="inline-flex rounded-xl bg-black/5 p-1">
        <button class="rounded-lg border-0 px-4 py-2 text-sm font-700" :class="tab === 'products' ? 'bg-white text-ink shadow-sm' : 'bg-transparent text-muted'" @click="tab = 'products'">محصولات</button>
        <button class="rounded-lg border-0 px-4 py-2 text-sm font-700" :class="tab === 'services' ? 'bg-white text-ink shadow-sm' : 'bg-transparent text-muted'" @click="tab = 'services'">خدمات</button>
      </div>
      <div v-if="tab === 'products'" class="flex w-full items-center gap-2 sm:w-auto">
        <div class="relative min-w-0 flex-1 sm:w-80">
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

    <section class="list-panel">
      <div v-if="tab === 'products'" class="flex min-h-0 flex-1 flex-col">
        <div v-if="products?.length" class="flex min-h-0 flex-1 flex-col">
          <div class="mb-3 flex items-center justify-between gap-3 rounded-xl bg-brand-50 px-3 py-2.5 sm:hidden">
            <span class="flex items-center gap-2 text-xs font-700 text-brand-900"><span class="i-lucide-move-horizontal h-4.5 w-4.5" />کارت‌ها را به چپ و راست بکشید</span>
            <div class="flex shrink-0 gap-1">
              <button type="button" class="grid h-8 w-8 place-items-center rounded-lg border border-brand-200 bg-white text-brand-900" aria-label="کارت قبلی" @click="scrollProductRail(-1)"><span class="i-lucide-chevron-right h-4 w-4" /></button>
              <button type="button" class="grid h-8 w-8 place-items-center rounded-lg border border-brand-200 bg-white text-brand-900" aria-label="کارت بعدی" @click="scrollProductRail(1)"><span class="i-lucide-chevron-left h-4 w-4" /></button>
            </div>
          </div>
          <div ref="productRail" class="scroll-container -mx-4 flex min-h-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:block sm:overflow-y-auto sm:px-1">
            <article
              v-for="(product, index) in products"
              :key="product.id"
              class="card flex min-w-[min(84vw,22rem)] snap-start flex-col gap-3 border-2 px-4 py-4 sm:mb-3 sm:min-w-0 sm:flex-row sm:items-center sm:border sm:px-5"
              :class="isProductReady(product) ? 'border-emerald-200 sm:border-black/7' : 'border-amber-300 bg-amber-50/35 sm:border-amber-200'"
            >
              <div class="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                <img v-if="product.imageUrl" :src="productImageUrl(product.imageUrl)" :alt="product.displayName" class="h-18 w-18 shrink-0 object-contain mix-blend-multiply sm:h-20 sm:w-20">
                <span v-else class="grid h-18 w-18 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><span class="i-lucide-package h-5 w-5" /></span>
                <div class="min-w-0 flex-1">
                  <strong class="block line-clamp-2 text-sm leading-6">{{ product.displayName }}</strong>
                  <div class="mt-2 flex flex-wrap gap-1.5">
                    <span class="badge text-[10px]" :class="product.shopConfiguration?.salePrice ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-100 text-amber-800'">
                      {{ product.shopConfiguration?.salePrice ? 'قیمت ثبت شده' : 'قیمت وارد نشده' }}
                    </span>
                    <span class="badge text-[10px]" :class="product.shopConfiguration?.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-black/5 text-muted'">
                      {{ product.shopConfiguration?.isActive ? 'فعال در فروشگاه' : 'غیرفعال' }}
                    </span>
                  </div>
                  <span class="mt-2 block text-xs leading-5 text-muted">
                    دوره تعویض: {{ productDefaultIntervalKm(product) ? `${productDefaultIntervalKm(product)?.toLocaleString('fa-IR')} کیلومتر` : 'تعیین نشده' }}
                  </span>
                </div>
              </div>
              <div class="mt-auto flex flex-col gap-2 border-t border-black/7 pt-3 sm:mt-0 sm:min-w-52 sm:border-0 sm:pt-0">
                <strong class="text-sm" :class="product.shopConfiguration?.salePrice ? 'text-ink' : 'text-amber-700'">
                  {{ product.shopConfiguration?.salePrice ? money(product.shopConfiguration.salePrice, shopCurrency) : 'بدون قیمت' }}
                </strong>
                <div class="flex items-center gap-2">
                  <div class="hidden flex-col sm:flex">
                    <button class="btn-ghost h-6 w-7 p-0" :disabled="movingCard || !canMove(products || [], index, -1)" title="انتقال به بالا" aria-label="انتقال به بالا" @click="moveCard('product', index, -1)"><span class="i-lucide-chevron-up h-4 w-4" /></button>
                    <button class="btn-ghost h-6 w-7 p-0" :disabled="movingCard || !canMove(products || [], index, 1)" title="انتقال به پایین" aria-label="انتقال به پایین" @click="moveCard('product', index, 1)"><span class="i-lucide-chevron-down h-4 w-4" /></button>
                  </div>
                  <button class="btn-primary flex-1 justify-center px-3 py-2.5" @click="editProduct(product)">
                    <span class="i-lucide-tags h-4 w-4" />
                    {{ isProductReady(product) ? 'ویرایش قیمت' : 'قیمت‌گذاری و فعال‌سازی' }}
                  </button>
                </div>
              </div>
            </article>
          </div>
        </div>
        <AppEmptyState
          v-else
          class="card"
          title="محصولی پیدا نشد"
          description="اگر محصول موردنظرتان وجود ندارد، از دکمه ثبت پیشنهاد محصول استفاده کنید."
        />
      </div>
      <div v-else class="flex min-h-0 flex-1 flex-col">
        <div v-if="services?.length" class="scroll-container list-scroll card-stack">
          <div v-for="(service, index) in services" :key="service.id" class="card flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
            <div class="flex min-w-0 flex-1 items-center gap-3">
              <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><span class="i-lucide-wrench h-5 w-5" /></span>
              <div class="min-w-0 flex-1"><strong class="block truncate text-sm">{{ service.name }}</strong><span class="mt-1 block truncate text-xs text-muted">{{ service.category || 'خدمت عمومی' }}</span></div>
            </div>
            <div class="flex items-center justify-between gap-2 sm:justify-end">
              <strong :class="service.shopConfiguration?.fee ? 'text-ink' : 'text-amber-600'">
                {{ service.shopConfiguration?.fee ? money(service.shopConfiguration.fee, shopCurrency) : 'بدون اجرت' }}
              </strong>
              <div class="flex flex-col">
                <button class="btn-ghost h-6 w-7 p-0" :disabled="movingCard || !canMove(services || [], index, -1)" title="انتقال به بالا" aria-label="انتقال به بالا" @click="moveCard('service', index, -1)"><span class="i-lucide-chevron-up h-4 w-4" /></button>
                <button class="btn-ghost h-6 w-7 p-0" :disabled="movingCard || !canMove(services || [], index, 1)" title="انتقال به پایین" aria-label="انتقال به پایین" @click="moveCard('service', index, 1)"><span class="i-lucide-chevron-down h-4 w-4" /></button>
              </div>
              <button class="btn-secondary px-3 py-2" @click="editService(service)">تنظیم اجرت</button>
            </div>
          </div>
        </div>
        <AppEmptyState v-else class="card" title="خدمتی در کاتالوگ نیست" />
      </div>
    </section>

    <AppModal :open="Boolean(editing)" :title="editing?.title || ''" description="قیمت، دوره تعویض و وضعیت این قلم فقط برای فروشگاه شما اعمال می‌شود." @close="editing = null">
      <form v-if="editing" class="space-y-5" @submit.prevent="saveSetting">
        <div v-if="editing.type === 'product'" class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900">
          <strong class="block text-sm">برای آماده‌شدن این محصول دو کار انجام دهید:</strong>
          ۱. قیمت فروش را وارد کنید &nbsp; ۲. گزینه «فعال در فروشگاه» را روشن کنید.
        </div>
        <div>
          <label class="label">{{ editing.type === 'product' ? 'قیمت فروش' : 'اجرت پیش‌فرض' }} ({{ currencyLabel }})</label>
          <input v-model.number="editing.value" type="number" min="0" class="field text-left" dir="ltr" required>
          <p class="mb-0 mt-1 text-left text-xs text-muted" dir="rtl">{{ money(editing.value, shopCurrency) }}</p>
        </div>
        <div v-if="editing.type === 'product'">
          <label class="label">دوره تعویض پیش‌فرض (کیلومتر)</label>
          <input v-model.number="editing.defaultIntervalKm" type="number" min="0" step="500" class="field text-left" dir="ltr" placeholder="مثلاً 5000">
          <p class="mb-0 mt-2 text-xs leading-5 text-muted">هنگام ثبت سفارش خودکار وارد می‌شود و همان‌جا قابل تغییر است.</p>
        </div>
        <label class="flex items-center justify-between rounded-xl border border-black/7 p-3"><span><strong class="block text-sm">فعال در فروشگاه</strong><small class="text-muted">برای ثبت سرویس قابل انتخاب باشد</small></span><input v-model="editing.active" type="checkbox" class="h-5 w-5 accent-brand-600"></label>
        <label class="flex items-center justify-between rounded-xl border border-black/7 p-3"><span><strong class="block text-sm">افزودن به محبوب‌ها</strong><small class="text-muted">در ابتدای فهرست نمایش داده شود</small></span><input v-model="editing.favorite" type="checkbox" class="h-5 w-5 accent-brand-600"></label>
        <button class="btn-primary w-full" :disabled="saving">{{ editing.type === 'product' ? 'ذخیره قیمت و وضعیت' : 'ذخیره تنظیمات' }}</button>
      </form>
    </AppModal>

    <ProductEditorModal
      :open="showSuggestion"
      title="ثبت پیشنهاد محصول"
      description="مشخصات محصول را وارد کنید؛ پس از تأیید مدیر، محصول برای فروشگاه شما فعال می‌شود."
      submit-label="ارسال برای بررسی مدیر"
      :saving="savingSuggestion"
      :value="suggestionValue"
      :product-types="productTypes || []"
      :vehicle-models="vehicleModels || []"
      @close="showSuggestion = false"
      @submit="submitProductSuggestion"
    />
  </div>
</template>
