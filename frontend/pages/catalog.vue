<script setup lang="ts">
import type { CatalogService, Product } from '~/types/api'

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

const { data: products, refresh: refreshProducts } = await useAsyncData('catalog-products', () => api.get<Product[]>('/catalog/products', search.value ? { search: search.value } : undefined), { watch: [search] })
const { data: services, refresh: refreshServices } = await useAsyncData('catalog-services', () => api.get<CatalogService[]>('/catalog/services'))

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
    active: product.shopConfiguration?.isActive ?? true,
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
</script>

<template>
  <div class="list-page">
    <header class="mb-6">
      <p class="m-0 text-sm font-700 text-brand-700">کاتالوگ فروشگاه</p>
      <h1 class="mb-0 mt-1 text-2xl font-950">محصولات، خدمات و قیمت‌ها</h1>
      <p class="mb-0 mt-2 text-sm text-ink/45">اقلام فعال فروشگاه و قیمت پیش‌فرض هرکدام را مدیریت کنید.</p>
    </header>

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
          class="btn-secondary shrink-0 px-3 py-2.5"
          title="دریافت آخرین اطلاعات کاتالوگ"
          @click="tab === 'products' ? refreshProducts() : refreshServices()"
        >
          <span class="i-lucide-refresh-cw h-4 w-4" />
          تازه‌سازی
        </button>
      </div>
    </div>

    <section class="card list-panel">
      <div v-if="tab === 'products'" class="flex min-h-0 flex-1 flex-col">
        <div v-if="products?.length" class="scroll-container list-scroll divide-y divide-black/5">
          <div v-for="product in products" :key="product.id" class="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
            <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><span class="i-lucide-package h-5 w-5" /></span>
            <div class="min-w-0 flex-1">
              <strong class="block truncate text-sm">{{ product.displayName }}</strong>
              <span class="mt-1 block truncate text-xs text-ink/40">
                دوره تعویض: {{ productDefaultIntervalKm(product) ? `${productDefaultIntervalKm(product)?.toLocaleString('fa-IR')} کیلومتر` : 'تعیین نشده' }}
              </span>
            </div>
            <div class="flex items-center justify-between gap-3 sm:justify-end">
              <strong :class="product.shopConfiguration?.salePrice ? 'text-ink' : 'text-amber-600'">
                {{ product.shopConfiguration?.salePrice ? money(product.shopConfiguration.salePrice) : 'بدون قیمت' }}
              </strong>
              <button class="btn-secondary px-3 py-2" @click="editProduct(product)"><span class="i-lucide-pencil h-4 w-4" />تنظیم</button>
            </div>
          </div>
        </div>
        <AppEmptyState
          v-else
          title="محصولی پیدا نشد"
          description="مدیر سیستم باید علاوه بر دسته محصول، یک محصول قابل فروش ایجاد کند. سپس دکمه تازه‌سازی را بزنید."
        />
      </div>
      <div v-else class="flex min-h-0 flex-1 flex-col">
        <div v-if="services?.length" class="scroll-container list-scroll divide-y divide-black/5">
          <div v-for="service in services" :key="service.id" class="flex items-center gap-4 px-5 py-4">
            <span class="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-700"><span class="i-lucide-wrench h-5 w-5" /></span>
            <div class="flex-1"><strong class="text-sm">{{ service.name }}</strong><span class="mt-1 block text-xs text-ink/40">{{ service.category || 'خدمت عمومی' }}</span></div>
            <button class="btn-secondary px-3 py-2" @click="editService(service)">تعیین اجرت</button>
          </div>
        </div>
        <AppEmptyState v-else title="خدمتی در کاتالوگ نیست" />
      </div>
    </section>

    <AppModal :open="Boolean(editing)" :title="editing?.title || ''" description="قیمت، دوره تعویض و وضعیت این قلم فقط برای فروشگاه شما اعمال می‌شود." @close="editing = null">
      <form v-if="editing" class="space-y-5" @submit.prevent="saveSetting">
        <div><label class="label">{{ editing.type === 'product' ? 'قیمت فروش' : 'اجرت پیش‌فرض' }} (تومان)</label><input v-model.number="editing.value" type="number" min="0" class="field text-left" dir="ltr" required></div>
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
  </div>
</template>
