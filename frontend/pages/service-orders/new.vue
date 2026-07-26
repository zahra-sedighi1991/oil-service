<script setup lang="ts">
import type { CatalogService, Customer, Product, Vehicle } from '~/types/api'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'ثبت سرویس جدید' })

interface ProductLine {
  key: string
  productId?: string
  description: string
  quantity: number
  unitPrice: number
  intervalKm?: number
  intervalMonths?: number
}
interface LaborLine {
  key: string
  serviceId?: string
  description: string
  quantity: number
  unitFee: number
}

const route = useRoute()
const api = useApi()
const toast = useToast()
const { number, money, errorMessage } = useFormat()

const step = ref(1)
const customerSearch = ref('')
const selectedCustomer = ref<Customer | null>(null)
const selectedVehicle = ref<Vehicle | null>(null)
const odometer = ref<number | undefined>()
const note = ref('')
const products = ref<ProductLine[]>([])
const services = ref<LaborLine[]>([])
const showProduct = ref(false)
const showService = ref(false)
const showVehicle = ref(false)
const showShare = ref(false)
const productSearch = ref('')
const submitting = ref(false)
const savingVehicle = ref(false)
const success = ref<{ invoiceNo: string; totalAmount: number; publicToken?: string } | null>(null)
const vehicleForm = reactive({
  brandId: '',
  modelId: '',
  plate: '',
  temporaryIdentifier: '',
  year: undefined as number | undefined,
  lastOdometer: undefined as number | undefined
})
const customerQuery = computed(() => {
  const value = customerSearch.value.trim()
  if (!value) return undefined
  return /^[\d۰-۹٠-٩+\-\s]+$/.test(value) ? { mobile: value } : { search: value }
})

const { data: customers } = await useAsyncData(
  'service-customer-search',
  () => api.get<Customer[]>('/customers', customerQuery.value),
  { watch: [customerSearch] }
)
const { data: catalogProducts } = await useAsyncData(
  'service-product-search',
  () => api.get<Product[]>('/catalog/products', productSearch.value ? { search: productSearch.value } : undefined),
  { watch: [productSearch] }
)
const { data: catalogServices } = await useAsyncData('service-catalog', () => api.get<CatalogService[]>('/catalog/services'))
const { data: vehicleBrands } = await useAsyncData(
  'service-vehicle-brands',
  () => api.get<Array<{ id: string; nameFa: string }>>('/catalog/vehicle-brands')
)
const { data: vehicleModels } = await useAsyncData(
  'service-vehicle-models',
  () => vehicleForm.brandId
    ? api.get<Array<{ id: string; nameFa: string }>>('/catalog/vehicle-models', { brandId: vehicleForm.brandId })
    : Promise.resolve([]),
  { watch: [() => vehicleForm.brandId] }
)

const productTotal = computed(() => products.value.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0))
const serviceTotal = computed(() => services.value.reduce((sum, line) => sum + line.quantity * line.unitFee, 0))
const grandTotal = computed(() => productTotal.value + serviceTotal.value)
const canCreateVehicle = computed(() => Boolean(
  selectedCustomer.value
  && vehicleForm.brandId
  && vehicleForm.modelId
  && (vehicleForm.plate.trim() || vehicleForm.temporaryIdentifier.trim())
))

watch(selectedVehicle, vehicle => {
  if (vehicle?.lastOdometer !== undefined) odometer.value = vehicle.lastOdometer
})

onMounted(async () => {
  const customerId = String(route.query.customer || '')
  if (!customerId) return
  try {
    selectedCustomer.value = await api.get<Customer>(`/customers/${customerId}`)
    const vehicleId = String(route.query.vehicle || '')
    if (vehicleId) selectedVehicle.value = selectedCustomer.value.vehicles.find(item => item.id === vehicleId) || null
  } catch (error) {
    toast.error(errorMessage(error))
  }
})

function selectCustomer(customer: Customer) {
  selectedCustomer.value = customer
  selectedVehicle.value = customer.vehicles.length === 1 ? customer.vehicles[0] : null
}

function openVehicleModal() {
  vehicleForm.brandId = ''
  vehicleForm.modelId = ''
  vehicleForm.plate = ''
  vehicleForm.temporaryIdentifier = ''
  vehicleForm.year = undefined
  vehicleForm.lastOdometer = odometer.value
  showVehicle.value = true
}

async function createVehicle() {
  if (!selectedCustomer.value) return
  savingVehicle.value = true
  try {
    const created = await api.post<Vehicle>('/vehicles', {
      ownerCustomerId: selectedCustomer.value.id,
      brandId: vehicleForm.brandId,
      modelId: vehicleForm.modelId,
      plate: vehicleForm.plate || undefined,
      temporaryIdentifier: vehicleForm.temporaryIdentifier || undefined,
      year: vehicleForm.year,
      lastOdometer: vehicleForm.lastOdometer
    })
    const refreshedCustomer = await api.get<Customer>(`/customers/${selectedCustomer.value.id}`)
    selectedCustomer.value = refreshedCustomer
    selectedVehicle.value = refreshedCustomer.vehicles.find(vehicle => vehicle.id === created.id) || null
    if (selectedVehicle.value?.lastOdometer !== undefined) {
      odometer.value = selectedVehicle.value.lastOdometer
    }
    showVehicle.value = false
    toast.success('خودرو ثبت و برای این سرویس انتخاب شد.')
  } catch (error) {
    toast.error(errorMessage(error))
  } finally {
    savingVehicle.value = false
  }
}

function addProduct(product: Product) {
  products.value.push({
    key: crypto.randomUUID(),
    productId: product.id,
    description: product.displayName,
    quantity: 1,
    unitPrice: Number(product.shopConfiguration?.salePrice || 0),
    intervalKm: Number(product.attributes?.interval_km || product.attributes?.suggested_km || 0) || undefined,
    intervalMonths: Number(product.attributes?.interval_months || product.attributes?.suggested_months || 0) || undefined
  })
  showProduct.value = false
}

function addTemporaryProduct() {
  products.value.push({ key: crypto.randomUUID(), description: 'آیتم موقت', quantity: 1, unitPrice: 0 })
  showProduct.value = false
}

function addService(service: CatalogService) {
  services.value.push({
    key: crypto.randomUUID(),
    serviceId: service.id,
    description: service.name,
    quantity: 1,
    unitFee: Number(service.shopConfiguration?.fee || 0)
  })
  showService.value = false
}

function addLocalService() {
  services.value.push({ key: crypto.randomUUID(), description: 'خدمت محلی', quantity: 1, unitFee: 0 })
  showService.value = false
}

function goToItems() {
  if (!selectedCustomer.value || !selectedVehicle.value) return toast.error('مشتری و خودرو را انتخاب کنید.')
  if (odometer.value === undefined || odometer.value < 0) return toast.error('کیلومتر فعلی خودرو را وارد کنید.')
  if (selectedVehicle.value.lastOdometer && odometer.value < selectedVehicle.value.lastOdometer) {
    return toast.error('کیلومتر فعلی نمی‌تواند کمتر از آخرین کیلومتر ثبت‌شده باشد.')
  }
  step.value = 2
}

function goToReview() {
  if (!products.value.length && !services.value.length) return toast.error('حداقل یک محصول یا خدمت اضافه کنید.')
  if ([...products.value, ...services.value].some(line => line.quantity <= 0)) return toast.error('تعداد اقلام باید بیشتر از صفر باشد.')
  step.value = 3
}

async function completeOrder() {
  if (!selectedCustomer.value || !selectedVehicle.value || odometer.value === undefined) return
  submitting.value = true
  try {
    const draft = await api.post<{ id: string }>('/service-orders', {
      customerId: selectedCustomer.value.id,
      vehicleId: selectedVehicle.value.id,
      odometer: odometer.value,
      note: note.value || undefined,
      products: products.value.map(({ key, description, ...line }) => ({
        ...line,
        ...(!line.productId ? { description } : {})
      })),
      services: services.value.map(({ key, description, ...line }) => ({
        ...line,
        ...(!line.serviceId ? { description } : {})
      }))
    })
    const result = await api.post<{
      invoiceNo: string
      totalAmount: number
      publicToken?: string
    }>(`/service-orders/${draft.id}/complete`, { discountAmount: 0 }, {
      'Idempotency-Key': crypto.randomUUID()
    })
    success.value = result
    toast.success('سرویس و فاکتور با موفقیت ثبت شدند.')
  } catch (error) {
    toast.error(errorMessage(error))
  } finally {
    submitting.value = false
  }
}

function shareUrl(channel: 'eitaa' | 'telegram') {
  if (!success.value?.publicToken) return '#'
  const publicUrl = `${window.location.origin}/public/service-book/${success.value.publicToken}`
  const text = `دفترچه سرویس خودرو${selectedCustomer.value ? `ی ${selectedCustomer.value.name}` : ''}`
  const shareBase = channel === 'telegram'
    ? 'https://t.me/share/url'
    : 'https://eitaa.com/share/url'
  return `${shareBase}?url=${encodeURIComponent(publicUrl)}&text=${encodeURIComponent(text)}`
}
</script>

<template>
  <div>
    <header class="mb-6">
      <p class="m-0 text-sm font-700 text-brand-700">عملیات سریع</p>
      <h1 class="mb-0 mt-1 text-2xl font-950">ثبت سرویس جدید</h1>
    </header>

    <div v-if="!success" class="mb-6 flex items-center">
      <template v-for="item in 3" :key="item">
        <div class="flex items-center gap-2">
          <span class="grid h-9 w-9 place-items-center rounded-full text-sm font-900" :class="step >= item ? 'bg-brand-700 text-white' : 'bg-black/6 text-ink/35'">{{ number(item) }}</span>
          <span class="hidden text-sm font-700 sm:block" :class="step >= item ? 'text-ink' : 'text-ink/35'">{{ ['مشتری و خودرو', 'اقلام سرویس', 'مرور و ثبت'][item - 1] }}</span>
        </div>
        <div v-if="item < 3" class="mx-3 h-px flex-1" :class="step > item ? 'bg-brand-500' : 'bg-black/10'" />
      </template>
    </div>

    <section v-if="success" class="card mx-auto max-w-2xl overflow-hidden text-center">
      <div class="bg-brand-800 px-6 py-10 text-white">
        <span class="i-lucide-circle-check-big mx-auto block h-16 w-16 text-brand-300" />
        <h2 class="mb-0 mt-5 text-2xl font-950">سرویس با موفقیت ثبت شد</h2>
        <p class="mb-0 mt-2 text-sm text-white/55">فاکتور و سوابق خودرو اکنون به‌روز هستند.</p>
      </div>
      <div class="p-6">
        <div class="mb-6 grid grid-cols-2 gap-3">
          <div class="rounded-xl bg-black/3 p-4"><span class="block text-xs text-ink/40">شماره فاکتور</span><strong class="mt-1 block">{{ success.invoiceNo }}</strong></div>
          <div class="rounded-xl bg-black/3 p-4"><span class="block text-xs text-ink/40">مبلغ نهایی</span><strong class="mt-1 block">{{ money(success.totalAmount) }}</strong></div>
        </div>
        <div class="grid gap-2 sm:grid-cols-3">
          <NuxtLink to="/invoices" class="btn-primary no-underline">مشاهده فاکتور</NuxtLink>
          <button class="btn-secondary" :disabled="!success.publicToken" @click="showShare = true">
            <span class="i-lucide-share-2 h-4.5 w-4.5" />
            اشتراک‌گذاری
          </button>
          <button class="btn-ghost" @click="navigateTo('/service-orders/new', { replace: true })">سرویس بعدی</button>
        </div>
      </div>
    </section>

    <section v-else-if="step === 1" class="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
      <div class="card p-5">
        <h2 class="m-0 text-base font-900">۱. مشتری را پیدا کنید</h2>
        <div class="relative mt-4">
          <span class="i-lucide-search absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/30" />
          <input v-model="customerSearch" class="field pr-10" placeholder="نام یا شماره موبایل">
        </div>
        <div class="mt-3 max-h-80 space-y-2 overflow-y-auto">
          <button v-for="customer in customers" :key="customer.id" class="flex w-full items-center gap-3 rounded-xl border p-3 text-right transition" :class="selectedCustomer?.id === customer.id ? 'border-brand-500 bg-brand-50' : 'border-black/6 bg-white hover:border-brand-300'" @click="selectCustomer(customer)">
            <span class="grid h-9 w-9 place-items-center rounded-xl bg-black/4 text-sm font-900">{{ customer.name.slice(0, 1) }}</span>
            <div class="flex-1"><strong class="block text-sm">{{ customer.name }}</strong><span class="mt-0.5 block text-xs text-ink/40" dir="ltr">{{ customer.mobileDisplay }}</span></div>
            <span class="text-xs text-ink/35">{{ number(customer.vehicles.length) }} خودرو</span>
          </button>
        </div>
        <NuxtLink to="/customers" class="btn-ghost mt-3 w-full no-underline"><span class="i-lucide-user-plus" />مشتری در فهرست نیست؟</NuxtLink>
      </div>

      <div class="card p-5">
        <div class="flex items-center justify-between gap-3">
          <h2 class="m-0 text-base font-900">۲. خودرو و کیلومتر</h2>
          <button
            v-if="selectedCustomer"
            class="btn-secondary px-3 py-2"
            @click="openVehicleModal"
          >
            <span class="i-lucide-car-front h-4 w-4" />
            افزودن خودرو
          </button>
        </div>
        <div v-if="selectedCustomer" class="mt-4">
          <div v-if="selectedCustomer.vehicles.length" class="grid gap-2 sm:grid-cols-2">
            <button v-for="vehicle in selectedCustomer.vehicles" :key="vehicle.id" class="rounded-xl border p-3 text-right transition" :class="selectedVehicle?.id === vehicle.id ? 'border-brand-500 bg-brand-50' : 'border-black/7 bg-white hover:border-brand-300'" @click="selectedVehicle = vehicle">
              <span class="i-lucide-car-front mb-2 block h-5 w-5 text-brand-600" />
              <strong class="block text-sm">{{ vehicle.brand?.nameFa }} {{ vehicle.model?.nameFa }}</strong>
              <span class="mt-1 block text-xs text-ink/45">{{ vehicle.plateDisplay || vehicle.temporaryIdentifier }}</span>
            </button>
          </div>
          <div v-else class="rounded-xl border border-dashed border-black/10 p-5 text-center text-sm text-ink/45">
            این مشتری خودرو ندارد.
            <button class="btn-ghost mx-auto mt-2 text-brand-700" @click="openVehicleModal">
              همین‌جا خودرو را اضافه کنید
            </button>
          </div>
          <div class="mt-5"><label class="label">کیلومتر فعلی</label><input v-model.number="odometer" type="number" min="0" class="field text-left" dir="ltr" placeholder="126500"></div>
        </div>
        <div v-else class="mt-4 grid min-h-52 place-items-center rounded-xl bg-black/[.025] text-center text-sm text-ink/35">ابتدا مشتری را از ستون مقابل انتخاب کنید.</div>
        <button class="btn-primary mt-5 w-full" :disabled="!selectedCustomer || !selectedVehicle" @click="goToItems">ادامه و افزودن اقلام<span class="i-lucide-arrow-left h-4 w-4" /></button>
      </div>
    </section>

    <section v-else-if="step === 2" class="grid gap-5 xl:grid-cols-[1fr_1fr]">
      <div class="card overflow-hidden">
        <header class="flex items-center justify-between border-b border-black/6 px-5 py-4">
          <div><h2 class="m-0 text-base font-900">محصولات مصرفی</h2><p class="m-0 mt-1 text-xs text-ink/40">{{ number(products.length) }} قلم</p></div>
          <button class="btn-secondary px-3 py-2" @click="showProduct = true"><span class="i-lucide-plus h-4 w-4" />افزودن</button>
        </header>
        <div v-if="products.length" class="divide-y divide-black/5">
          <div v-for="(line, index) in products" :key="line.key" class="p-4">
            <div class="mb-3 flex items-start justify-between gap-3"><input v-model="line.description" class="min-w-0 flex-1 border-0 bg-transparent text-sm font-800 outline-none" :readonly="Boolean(line.productId)"><button class="btn-ghost h-8 w-8 p-0 text-danger" @click="products.splice(index, 1)"><span class="i-lucide-trash-2 h-4 w-4" /></button></div>
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div><label class="label">تعداد</label><input v-model.number="line.quantity" type="number" min=".001" step=".001" class="field py-2"></div>
              <div><label class="label">قیمت واحد</label><input v-model.number="line.unitPrice" type="number" min="0" class="field py-2"></div>
              <div><label class="label">دوره کیلومتر</label><input v-model.number="line.intervalKm" type="number" min="0" class="field py-2"></div>
              <div><label class="label">دوره ماه</label><input v-model.number="line.intervalMonths" type="number" min="0" class="field py-2"></div>
            </div>
            <p class="mb-0 mt-3 text-left text-xs font-800 text-brand-700" dir="rtl">{{ money(line.quantity * line.unitPrice) }}</p>
          </div>
        </div>
        <AppEmptyState v-else icon="i-lucide-package-open" title="محصولی اضافه نشده" />
      </div>

      <div class="card overflow-hidden">
        <header class="flex items-center justify-between border-b border-black/6 px-5 py-4">
          <div><h2 class="m-0 text-base font-900">خدمات و اجرت</h2><p class="m-0 mt-1 text-xs text-ink/40">{{ number(services.length) }} خدمت</p></div>
          <button class="btn-secondary px-3 py-2" @click="showService = true"><span class="i-lucide-plus h-4 w-4" />افزودن</button>
        </header>
        <div v-if="services.length" class="divide-y divide-black/5">
          <div v-for="(line, index) in services" :key="line.key" class="p-4">
            <div class="mb-3 flex items-start justify-between gap-3"><input v-model="line.description" class="min-w-0 flex-1 border-0 bg-transparent text-sm font-800 outline-none" :readonly="Boolean(line.serviceId)"><button class="btn-ghost h-8 w-8 p-0 text-danger" @click="services.splice(index, 1)"><span class="i-lucide-trash-2 h-4 w-4" /></button></div>
            <div class="grid grid-cols-2 gap-2">
              <div><label class="label">تعداد</label><input v-model.number="line.quantity" type="number" min=".001" step=".001" class="field py-2"></div>
              <div><label class="label">اجرت واحد</label><input v-model.number="line.unitFee" type="number" min="0" class="field py-2"></div>
            </div>
            <p class="mb-0 mt-3 text-left text-xs font-800 text-brand-700" dir="rtl">{{ money(line.quantity * line.unitFee) }}</p>
          </div>
        </div>
        <AppEmptyState v-else icon="i-lucide-wrench" title="خدمتی اضافه نشده" />
      </div>

      <div class="sticky bottom-20 z-20 flex items-center justify-between rounded-2xl bg-ink p-4 text-white shadow-2xl xl:bottom-4 xl:col-span-2">
        <div><span class="block text-xs text-white/45">جمع فعلی</span><strong class="text-lg">{{ money(grandTotal) }}</strong></div>
        <div class="flex gap-2"><button class="btn-ghost text-white" @click="step = 1">مرحله قبل</button><button class="btn bg-brand-500 text-white" @click="goToReview">مرور و ثبت<span class="i-lucide-arrow-left" /></button></div>
      </div>
    </section>

    <section v-else class="mx-auto max-w-3xl">
      <div class="card overflow-hidden">
        <header class="bg-ink p-5 text-white sm:p-6">
          <p class="m-0 text-xs text-white/45">مرور نهایی سرویس</p>
          <div class="mt-2 flex items-end justify-between gap-4"><h2 class="m-0 text-xl font-950">{{ selectedCustomer?.name }}</h2><strong class="text-brand-300">{{ selectedVehicle?.plateDisplay || selectedVehicle?.temporaryIdentifier }}</strong></div>
          <p class="mb-0 mt-2 text-sm text-white/50">{{ number(odometer) }} کیلومتر</p>
        </header>
        <div class="p-5 sm:p-6">
          <div class="space-y-3">
            <div v-for="line in products" :key="line.key" class="flex items-center justify-between gap-3 text-sm"><span class="text-ink/65">{{ line.description }} × {{ number(line.quantity) }}</span><strong>{{ money(line.quantity * line.unitPrice) }}</strong></div>
            <div v-for="line in services" :key="line.key" class="flex items-center justify-between gap-3 text-sm"><span class="text-ink/65">{{ line.description }} × {{ number(line.quantity) }}</span><strong>{{ money(line.quantity * line.unitFee) }}</strong></div>
          </div>
          <div class="my-5 border-t border-dashed border-black/10" />
          <div class="flex items-center justify-between"><span class="font-800">مبلغ نهایی</span><strong class="text-xl font-950 text-brand-700">{{ money(grandTotal) }}</strong></div>
          <div class="mt-5"><label class="label">یادداشت سرویس</label><textarea v-model="note" class="field min-h-24" placeholder="مثلاً بررسی سطح ضدیخ در مراجعه بعد..." /></div>
          <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button class="btn-ghost" @click="step = 2">بازگشت و ویرایش</button>
            <button class="btn-primary min-w-44" :disabled="submitting" @click="completeOrder"><span v-if="submitting" class="i-lucide-loader-circle animate-spin" /><span v-else class="i-lucide-circle-check" />نهایی‌سازی سرویس</button>
          </div>
        </div>
      </div>
    </section>

    <AppModal
      :open="showShare"
      title="ارسال دفترچه سرویس"
      description="پیام‌رسان موردنظر را انتخاب کنید تا لینک دفترچه برای مشتری ارسال شود."
      @close="showShare = false"
    >
      <div class="grid gap-3 sm:grid-cols-2">
        <a
          :href="shareUrl('eitaa')"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-3 rounded-2xl border border-black/7 bg-white p-4 text-right text-ink no-underline transition hover:border-amber-400 hover:bg-amber-50"
          @click="showShare = false"
        >
          <span class="grid h-11 w-11 place-items-center rounded-xl bg-amber-500 text-white">
            <span class="i-lucide-message-circle h-6 w-6" />
          </span>
          <span><strong class="block">ارسال در ایتا</strong><small class="mt-1 block text-ink/45">انتخاب مخاطب در ایتا</small></span>
        </a>
        <a
          :href="shareUrl('telegram')"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-3 rounded-2xl border border-black/7 bg-white p-4 text-right text-ink no-underline transition hover:border-sky-400 hover:bg-sky-50"
          @click="showShare = false"
        >
          <span class="grid h-11 w-11 place-items-center rounded-xl bg-sky-500 text-white">
            <span class="i-lucide-send h-6 w-6" />
          </span>
          <span><strong class="block">ارسال در تلگرام</strong><small class="mt-1 block text-ink/45">انتخاب مخاطب در تلگرام</small></span>
        </a>
      </div>
    </AppModal>

    <AppModal :open="showProduct" title="افزودن محصول" description="محصول کاتالوگی یا آیتم موقت انتخاب کنید." @close="showProduct = false">
      <div class="relative mb-3"><span class="i-lucide-search absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" /><input v-model="productSearch" class="field pr-9" placeholder="نام محصول، برند یا ویژگی..."></div>
      <div class="max-h-80 space-y-2 overflow-y-auto">
        <button v-for="product in catalogProducts" :key="product.id" class="flex w-full items-center justify-between rounded-xl border border-black/7 p-3 text-right hover:border-brand-300 hover:bg-brand-50" @click="addProduct(product)">
          <div><strong class="block text-sm">{{ product.displayName }}</strong><span class="mt-1 block text-xs text-ink/40">{{ product.shopConfiguration?.salePrice ? money(product.shopConfiguration.salePrice) : 'قیمت تعیین نشده' }}</span></div>
          <span class="i-lucide-plus h-5 w-5 text-brand-600" />
        </button>
      </div>
      <button class="btn-ghost mt-3 w-full border border-dashed border-black/10" @click="addTemporaryProduct"><span class="i-lucide-file-plus" />ثبت آیتم موقت خارج از کاتالوگ</button>
    </AppModal>

    <AppModal :open="showService" title="افزودن خدمت" description="خدمت استاندارد یا خدمت محلی انتخاب کنید." @close="showService = false">
      <div class="max-h-80 space-y-2 overflow-y-auto">
        <button v-for="service in catalogServices" :key="service.id" class="flex w-full items-center justify-between rounded-xl border border-black/7 p-3 text-right hover:border-brand-300 hover:bg-brand-50" @click="addService(service)">
          <div><strong class="block text-sm">{{ service.name }}</strong><span class="mt-1 block text-xs text-ink/40">{{ service.category || 'خدمت عمومی' }}</span></div>
          <span class="i-lucide-plus h-5 w-5 text-brand-600" />
        </button>
      </div>
      <button class="btn-ghost mt-3 w-full border border-dashed border-black/10" @click="addLocalService"><span class="i-lucide-file-plus" />ثبت خدمت محلی</button>
    </AppModal>

    <AppModal
      :open="showVehicle"
      title="افزودن خودرو"
      description="بعد از ثبت، خودرو به‌صورت خودکار برای این سرویس انتخاب می‌شود."
      @close="showVehicle = false"
    >
      <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="createVehicle">
        <div>
          <label class="label">برند خودرو</label>
          <select v-model="vehicleForm.brandId" class="field" required @change="vehicleForm.modelId = ''">
            <option value="" disabled>انتخاب برند</option>
            <option v-for="brand in vehicleBrands || []" :key="brand.id" :value="brand.id">
              {{ brand.nameFa }}
            </option>
          </select>
          <small v-if="!vehicleBrands?.length" class="mt-2 block text-amber-700">
            مدیر سیستم باید ابتدا برند خودرو را در اطلاعات پایه ثبت کند.
          </small>
        </div>
        <div>
          <label class="label">مدل خودرو</label>
          <select v-model="vehicleForm.modelId" class="field" :disabled="!vehicleForm.brandId" required>
            <option value="" disabled>انتخاب مدل</option>
            <option v-for="model in vehicleModels || []" :key="model.id" :value="model.id">
              {{ model.nameFa }}
            </option>
          </select>
          <small v-if="vehicleForm.brandId && !vehicleModels?.length" class="mt-2 block text-amber-700">
            برای این برند هنوز مدلی ثبت نشده است.
          </small>
        </div>
        <div>
          <label class="label">پلاک</label>
          <input v-model="vehicleForm.plate" class="field" placeholder="مثلاً ۱۲ب۳۴۵ایران۶۷">
        </div>
        <div>
          <label class="label">شناسه موقت</label>
          <input v-model="vehicleForm.temporaryIdentifier" class="field" placeholder="برای خودروی بدون پلاک">
        </div>
        <div>
          <label class="label">سال ساخت</label>
          <input v-model.number="vehicleForm.year" type="number" min="1300" max="2200" class="field">
        </div>
        <div>
          <label class="label">کیلومتر فعلی</label>
          <input v-model.number="vehicleForm.lastOdometer" type="number" min="0" class="field">
        </div>
        <p class="m-0 text-xs leading-5 text-ink/45 sm:col-span-2">
          وارد کردن یکی از دو مقدار «پلاک» یا «شناسه موقت» الزامی است.
        </p>
        <div class="flex justify-end gap-2 pt-2 sm:col-span-2">
          <button type="button" class="btn-ghost" @click="showVehicle = false">انصراف</button>
          <button class="btn-primary" :disabled="savingVehicle || !canCreateVehicle">
            {{ savingVehicle ? 'در حال ثبت...' : 'ثبت و انتخاب خودرو' }}
          </button>
        </div>
      </form>
    </AppModal>
  </div>
</template>
