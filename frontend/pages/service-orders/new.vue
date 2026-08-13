<script setup lang="ts">
import type { CatalogService, Customer, Product, Shop, Vehicle, VehicleModelOption } from '~/types/api'
import type { ProductEditorValue } from '~/types/product-editor'
import type { ServiceShareCardData } from '~/types/share'
import { createRandomId } from '~/utils/random-id'

interface ProductTypeOption { id: string; title: string }

definePageMeta({ middleware: 'auth' })
useHead({ title: 'ثبت سرویس جدید' })

interface ProductLine {
  key: string
  productId?: string
  imageUrl?: string
  description: string
  quantity: number
  unitPrice: number
  intervalKm?: number
}
interface LaborLine {
  key: string
  serviceId?: string
  description: string
  quantity: number
  unitFee: number
}
interface PendingSuggestion {
  id: string
  entityType: 'product' | 'service'
  payload: { description?: string }
  status: 'pending'
}
interface PreviousOrder {
  status: 'draft' | 'completed' | 'canceled'
  odometer: number
  productLines: Array<{
    productId?: string
    intervalKm?: number
    dueOdometer?: number
    snapshot?: { displayName?: string; description?: string }
  }>
}
interface CompletionResult {
  invoiceId: string
  invoiceNo: string
  totalAmount: number
  currency?: string
  publicToken?: string
}

const route = useRoute()
const api = useApi()
const productImageUrl = useProductImageUrl()
const config = useRuntimeConfig()
const toast = useToast()
const { number, money, errorMessage } = useFormat()

const pageRoot = ref<HTMLElement | null>(null)
const step = ref(1)
const customerSearch = ref('')
const selectedCustomer = ref<Customer | null>(null)
const selectedVehicle = ref<Vehicle | null>(null)
const odometer = ref<number | undefined>()
const suggestedOdometer = ref<number | undefined>()
const loadingSuggestedOdometer = ref(false)
const note = ref('')
const discountAmount = ref(0)
const products = ref<ProductLine[]>([])
const services = ref<LaborLine[]>([])
const showProduct = ref(false)
const showProductSuggestion = ref(false)
const showService = ref(false)
const showVehicle = ref(false)
const showCustomer = ref(false)
const showShare = ref(false)
const productSearch = ref('')
const selectedProductIds = ref<string[]>([])
const selectedPendingProductIds = ref<string[]>([])
const selectedServiceIds = ref<string[]>([])
const selectedPendingServiceIds = ref<string[]>([])
const savingProductSuggestion = ref(false)
const productSuggestionValue = ref<Partial<ProductEditorValue>>({})
const localServiceName = ref('')
const submitting = ref(false)
const savingVehicle = ref(false)
const savingCustomer = ref(false)
const preparingShare = ref(false)
const plateIncomplete = ref(false)
const pendingOrderId = ref('')
const completionKey = ref('')
const pendingOrderSnapshot = ref('')
const success = ref<{
  invoiceId: string
  invoiceNo: string
  totalAmount: number
  currency?: string
  publicToken?: string
  completedAt: string
} | null>(null)
const vehicleForm = reactive({
  modelId: '',
  plate: '',
  lastOdometer: undefined as number | undefined
})
const customerQuery = computed(() => {
  const value = customerSearch.value.trim()
  return value ? { search: value } : null
})

const { data: customers, refresh: refreshCustomers } = await useAsyncData(
  'service-customer-search',
  () => customerQuery.value
    ? api.get<Customer[]>('/customers', customerQuery.value)
    : Promise.resolve([]),
  { watch: [customerSearch] }
)
const { data: catalogProducts } = await useAsyncData(
  'service-product-search',
  () => api.get<Product[]>('/catalog/products', {
    ...(productSearch.value ? { search: productSearch.value } : {}),
    activeOnly: true,
    ...(selectedVehicle.value?.id ? { vehicleId: selectedVehicle.value.id } : {})
  }),
  { watch: [productSearch, () => selectedVehicle.value?.id] }
)
const { data: catalogServices } = await useAsyncData('service-catalog', () => api.get<CatalogService[]>('/catalog/services'))
const { data: pendingSuggestions } = await useAsyncData(
  'service-pending-suggestions',
  () => api.get<PendingSuggestion[]>('/suggestions', { status: 'pending' })
)
const { data: vehicleModels } = await useAsyncData(
  'service-vehicle-models',
  () => api.get<VehicleModelOption[]>('/catalog/vehicle-models')
)
const { data: productTypes } = await useAsyncData(
  'service-product-suggestion-types',
  () => api.get<ProductTypeOption[]>('/catalog/product-types')
)
const { data: shop } = await useAsyncData('shop-profile', () => api.get<Shop>('/shop/profile'))
const shopCurrency = computed(() => shop.value?.currency || 'TOMAN')
const currencyLabel = computed(() => shopCurrency.value === 'IRR' ? 'ریال' : 'تومان')

const productTotal = computed(() => products.value.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0))
const serviceTotal = computed(() => services.value.reduce((sum, line) => sum + line.quantity * line.unitFee, 0))
const grandTotal = computed(() => productTotal.value + serviceTotal.value)
const payableTotal = computed(() => Math.max(0, grandTotal.value - Number(discountAmount.value || 0)))
const pendingProductSuggestions = computed(() => {
  const search = productSearch.value.trim().toLocaleLowerCase('fa')
  return (pendingSuggestions.value || []).filter((item) => {
    const description = item.payload.description?.trim()
    return item.entityType === 'product'
      && Boolean(description)
      && (!search || description!.toLocaleLowerCase('fa').includes(search))
      && !products.value.some(line => line.description.trim().toLocaleLowerCase('fa') === description!.toLocaleLowerCase('fa'))
  })
})
const selectableProducts = computed(() => (catalogProducts.value || []).filter(
  product => product.compatibility?.status !== 'incompatible'
    && !products.value.some(line => line.productId === product.id)
))
const compatibleProductCount = computed(() => selectableProducts.value.filter(
  product => product.compatibility?.status === 'compatible'
).length)
const selectedProductCount = computed(
  () => selectedProductIds.value.length + selectedPendingProductIds.value.length
)
const customerForm = reactive({ name: '', mobile: '', gender: 'male' as 'male' | 'female', note: '' })
const pendingServiceSuggestions = computed(() => (pendingSuggestions.value || []).filter(
  item => item.entityType === 'service'
    && Boolean(item.payload.description?.trim())
    && !services.value.some(
      line => line.description.trim().toLocaleLowerCase('fa') === item.payload.description!.trim().toLocaleLowerCase('fa')
    )
))
const selectableServices = computed(() => (catalogServices.value || []).filter(
  service => !services.value.some(line => line.serviceId === service.id)
))
const canCreateVehicle = computed(() => Boolean(
  selectedCustomer.value
  && vehicleForm.modelId
))

function formattedOdometer(value: unknown) {
  if (value === '' || value === undefined || value === null) return ''
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? `${number(numericValue)} کیلومتر` : ''
}

let odometerRequest = 0

watch(step, async () => {
  await nextTick()
  const scrollContainer = pageRoot.value?.closest('main')
  if (scrollContainer instanceof HTMLElement) {
    scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
  }
})

watch(selectedVehicle, async (vehicle) => {
  const request = ++odometerRequest
  suggestedOdometer.value = undefined
  odometer.value = undefined
  if (!vehicle) return

  loadingSuggestedOdometer.value = true
  try {
    const orders = await api.get<PreviousOrder[]>('/service-orders', { vehicleId: vehicle.id })
    if (request !== odometerRequest) return
    const dueValues: number[] = []
    const latestProductTypes = new Set<string>()
    for (const order of orders) {
      if (order.status !== 'completed') continue
      for (const line of order.productLines) {
        const product = catalogProducts.value?.find(item => item.id === line.productId)
        const temporaryName = line.snapshot?.displayName || line.snapshot?.description || 'بدون‌نام'
        const productTypeKey = product?.productTypeId || line.productId || `temporary:${temporaryName.trim().toLocaleLowerCase('fa')}`
        if (latestProductTypes.has(productTypeKey)) continue
        latestProductTypes.add(productTypeKey)
        if (line.dueOdometer !== undefined && line.dueOdometer !== null) {
          const dueOdometer = Number(line.dueOdometer)
          if (Number.isFinite(dueOdometer) && dueOdometer > 0) dueValues.push(dueOdometer)
          continue
        }
        const interval = Number(line.intervalKm ?? (product ? productDefaultIntervalKm(product) : 0))
        if (Number.isFinite(interval) && interval > 0) dueValues.push(order.odometer + interval)
      }
    }
    if (!dueValues.length) return
    suggestedOdometer.value = Math.min(...dueValues)
  } catch (error) {
    toast.error(errorMessage(error))
  } finally {
    if (request === odometerRequest) loadingSuggestedOdometer.value = false
  }
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

function normalizeSearchedMobile(value: string) {
  const persian = '۰۱۲۳۴۵۶۷۸۹'
  const arabic = '٠١٢٣٤٥٦٧٨٩'
  const digits = value
    .replace(/[۰-۹]/g, digit => String(persian.indexOf(digit)))
    .replace(/[٠-٩]/g, digit => String(arabic.indexOf(digit)))
    .replace(/\D/g, '')
  if (digits.startsWith('98') && digits.length === 12) return `0${digits.slice(2)}`
  if (digits.startsWith('9') && digits.length === 10) return `0${digits}`
  return digits
}

function openCustomerModal() {
  const searchedValue = customerSearch.value.trim()
  const searchedMobile = /^[\d۰-۹٠-٩+\-\s]+$/.test(searchedValue)
    ? normalizeSearchedMobile(searchedValue)
    : ''
  Object.assign(customerForm, { name: '', mobile: searchedMobile, gender: 'male', note: '' })
  showCustomer.value = true
}

async function createCustomer() {
  savingCustomer.value = true
  try {
    const created = await api.post<Customer>('/customers', {
      mobile: customerForm.mobile.trim(),
      gender: customerForm.gender,
      name: customerForm.name.trim() || undefined,
      note: customerForm.note.trim() || undefined
    })
    const customer = { ...created, vehicles: created.vehicles || [] }
    selectedCustomer.value = customer
    selectedVehicle.value = null
    customerSearch.value = ''
    await refreshCustomers()
    showCustomer.value = false
    toast.success('مشتری ثبت و برای این سفارش انتخاب شد.')
  } catch (error) {
    toast.error(errorMessage(error))
  } finally {
    savingCustomer.value = false
  }
}

function openVehicleModal() {
  vehicleForm.modelId = ''
  vehicleForm.plate = ''
  plateIncomplete.value = false
  vehicleForm.lastOdometer = odometer.value
  showVehicle.value = true
}

async function createVehicle() {
  if (!selectedCustomer.value) return
  if (!vehicleForm.modelId) return toast.error('مدل خودرو را انتخاب کنید.')
  if (plateIncomplete.value) return toast.error('پلاک را کامل وارد کنید یا همه بخش‌های آن را خالی بگذارید.')
  savingVehicle.value = true
  try {
    const created = await api.post<Vehicle>('/vehicles', {
      ownerCustomerId: selectedCustomer.value.id,
      modelId: vehicleForm.modelId,
      plate: vehicleForm.plate || undefined,
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

function productDefaultIntervalKm(product: Product) {
  const value = Number(
    product.shopConfiguration?.override?.intervalKm
    ?? product.attributes?.interval_km
    ?? product.attributes?.suggested_km
    ?? 0
  )
  return Number.isFinite(value) && value > 0 ? value : undefined
}

function addProduct(product: Product) {
  products.value.push({
    key: createRandomId(),
    productId: product.id,
    imageUrl: product.imageUrl,
    description: product.displayName,
    quantity: 1,
    unitPrice: Number(product.shopConfiguration?.salePrice || 0),
    intervalKm: productDefaultIntervalKm(product)
  })
}

function toggleSelection(items: string[], id: string) {
  const index = items.indexOf(id)
  if (index >= 0) items.splice(index, 1)
  else items.push(id)
}

function openProductModal() {
  selectedProductIds.value = []
  selectedPendingProductIds.value = []
  showProduct.value = true
}

function confirmProducts() {
  if (!selectedProductCount.value) {
    return toast.error('حداقل یک محصول را انتخاب کنید.')
  }
  for (const product of selectableProducts.value) {
    if (selectedProductIds.value.includes(product.id)) addProduct(product)
  }
  for (const item of pendingProductSuggestions.value) {
    if (selectedPendingProductIds.value.includes(item.id)) addPendingProduct(item)
  }
  showProduct.value = false
}

function addTemporaryProduct() {
  const name = productSearch.value.trim()
  if (!name) return toast.error('نام محصول خارج از کاتالوگ را وارد کنید.')
  products.value.push({ key: createRandomId(), description: name, quantity: 1, unitPrice: 0 })
  productSearch.value = ''
  showProduct.value = false
}

function openProductSuggestionModal() {
  productSuggestionValue.value = { name: productSearch.value.trim() }
  showProductSuggestion.value = true
}

async function submitProductSuggestion(value: ProductEditorValue) {
  savingProductSuggestion.value = true
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
    products.value.push({ key: createRandomId(), description: value.name, quantity: 1, unitPrice: 0 })
    productSearch.value = ''
    productSuggestionValue.value = {}
    showProductSuggestion.value = false
    showProduct.value = false
    toast.success('پیشنهاد محصول ثبت و به فاکتور اضافه شد.')
  } catch (error) {
    toast.error(errorMessage(error))
  } finally {
    savingProductSuggestion.value = false
  }
}

function addPendingProduct(item: PendingSuggestion) {
  const name = item.payload.description?.trim()
  if (!name) return
  products.value.push({ key: createRandomId(), description: name, quantity: 1, unitPrice: 0 })
  productSearch.value = ''
}

function addService(service: CatalogService) {
  services.value.push({
    key: createRandomId(),
    serviceId: service.id,
    description: service.name,
    quantity: 1,
    unitFee: Number(service.shopConfiguration?.fee || 0)
  })
}

function openServiceModal() {
  selectedServiceIds.value = []
  selectedPendingServiceIds.value = []
  showService.value = true
}

function confirmServices() {
  for (const service of selectableServices.value) {
    if (selectedServiceIds.value.includes(service.id)) addService(service)
  }
  for (const item of pendingServiceSuggestions.value) {
    if (selectedPendingServiceIds.value.includes(item.id)) addPendingService(item)
  }
  showService.value = false
}

function addLocalService() {
  const name = localServiceName.value.trim()
  if (!name) return toast.error('نام خدمت خارج از کاتالوگ را وارد کنید.')
  services.value.push({ key: createRandomId(), description: name, quantity: 1, unitFee: 0 })
  localServiceName.value = ''
  showService.value = false
}

function addPendingService(item: PendingSuggestion) {
  const name = item.payload.description?.trim()
  if (!name) return
  services.value.push({ key: createRandomId(), description: name, quantity: 1, unitFee: 0 })
}

function goToItems() {
  if (!selectedCustomer.value || !selectedVehicle.value) return toast.error('مشتری و خودرو را انتخاب کنید.')
  if (!Number.isInteger(odometer.value) || odometer.value! < 0) return toast.error('کیلومتر فعلی خودرو را به‌صورت عدد صحیح وارد کنید.')
  if (
    selectedVehicle.value.lastOdometer !== undefined
    && selectedVehicle.value.lastOdometer !== null
    && odometer.value! < selectedVehicle.value.lastOdometer
  ) {
    return toast.error('کیلومتر فعلی نمی‌تواند کمتر از آخرین کیلومتر ثبت‌شده باشد.')
  }
  step.value = 2
}

function goToReview() {
  if (!products.value.length && !services.value.length) return toast.error('حداقل یک محصول یا خدمت اضافه کنید.')
  if ([...products.value, ...services.value].some(line => !line.description.trim())) return toast.error('نام همه محصولات و خدمات الزامی است.')
  if ([...products.value, ...services.value].some(line => !Number.isFinite(line.quantity) || line.quantity <= 0)) {
    return toast.error('تعداد اقلام باید یک عدد معتبر و بیشتر از صفر باشد.')
  }
  if (products.value.some(line => !Number.isInteger(line.unitPrice) || line.unitPrice < 0)) {
    return toast.error('قیمت محصولات را به‌صورت عدد صحیح وارد کنید.')
  }
  if (services.value.some(line => !Number.isInteger(line.unitFee) || line.unitFee < 0)) {
    return toast.error('اجرت خدمات را به‌صورت عدد صحیح وارد کنید.')
  }
  for (const line of products.value) {
    if ((line.intervalKm as unknown) === '') line.intervalKm = undefined
    if (line.intervalKm !== undefined && (!Number.isInteger(line.intervalKm) || line.intervalKm < 0)) {
      return toast.error('بازه تعویض را به‌صورت عدد صحیح وارد کنید.')
    }
  }
  step.value = 3
}

function orderPayload() {
  if (!selectedCustomer.value || !selectedVehicle.value || odometer.value === undefined) return
  return {
    customerId: selectedCustomer.value.id,
    vehicleId: selectedVehicle.value.id,
    odometer: odometer.value,
    note: note.value || undefined,
    products: products.value.map(({ key, description, imageUrl, ...line }) => ({
      ...line,
      ...(!line.productId ? { description } : {})
    })),
    services: services.value.map(({ key, description, ...line }) => ({
      ...line,
      ...(!line.serviceId ? { description } : {})
    }))
  }
}

function showCompletion(result: CompletionResult) {
  success.value = { ...result, completedAt: new Date().toISOString() }
  toast.success('سرویس و فاکتور با موفقیت ثبت شدند.')
}

async function finalizePendingOrder() {
  const result = await api.post<CompletionResult>(
    `/service-orders/${pendingOrderId.value}/complete`,
    { discountAmount: discountAmount.value },
    { 'Idempotency-Key': completionKey.value }
  )
  showCompletion(result)
}

async function completeOrder() {
  const payload = orderPayload()
  if (!payload) return
  if (!Number.isInteger(discountAmount.value) || discountAmount.value < 0) {
    return toast.error('مبلغ تخفیف را به‌صورت عدد صحیح وارد کنید.')
  }
  if (discountAmount.value > grandTotal.value) {
    return toast.error('تخفیف نمی‌تواند بیشتر از جمع فاکتور باشد.')
  }
  submitting.value = true
  try {
    const snapshot = JSON.stringify(payload)
    if (!pendingOrderId.value) {
      const draft = await api.post<{ id: string }>('/service-orders', payload)
      pendingOrderId.value = draft.id
      pendingOrderSnapshot.value = snapshot
    } else if (pendingOrderSnapshot.value !== snapshot) {
      try {
        await api.patch(`/service-orders/${pendingOrderId.value}`, payload)
        pendingOrderSnapshot.value = snapshot
        completionKey.value = ''
      } catch (error: any) {
        // If the previous response was lost after the server completed the order,
        // the draft is no longer editable. Reusing the same key recovers its invoice.
        if ((error?.statusCode === 409 || error?.status === 409) && completionKey.value) {
          await finalizePendingOrder()
          return
        }
        throw error
      }
    }
    if (!completionKey.value) completionKey.value = createRandomId()
    await finalizePendingOrder()
  } catch (error) {
    toast.error(errorMessage(error))
  } finally {
    submitting.value = false
  }
}

const publicBookLink = computed(() => publicBookUrl(success.value?.publicToken || '', config.public.webBase))
const shareCustomerName = computed(() => {
  const name = selectedCustomer.value?.name?.trim()
  return name && name !== 'مشتری بدون نام' ? name : undefined
})
const shareMessage = computed(() => `دفترچه سرویس خودرو${shareCustomerName.value ? `ی ${shareCustomerName.value}` : ''}`)
const serviceShareCard = computed<ServiceShareCardData | undefined>(() => {
  if (!success.value || !selectedVehicle.value || odometer.value === undefined) return undefined
  const dueProducts = products.value
    .filter(line => line.intervalKm && line.intervalKm > 0)
    .map(line => ({ odometer: odometer.value! + line.intervalKm!, item: line.description }))
    .sort((a, b) => a.odometer - b.odometer)
  const nextDue = dueProducts[0]

  return {
    shopName: shop.value?.name || 'روغن‌یار',
    shopCity: shop.value?.city,
    shopPhone: shop.value?.publicPhone,
    customerName: shareCustomerName.value,
    odometer: odometer.value,
    nextDueOdometer: nextDue?.odometer,
    nextDueItem: nextDue?.item,
    invoiceNo: success.value.invoiceNo,
    totalAmount: success.value.totalAmount,
    currency: success.value.currency || shop.value?.currency,
    serviceDate: success.value.completedAt,
    products: products.value.map(line => ({
      description: line.description,
      totalAmount: line.quantity * line.unitPrice
    })),
    services: services.value.map(line => ({
      description: line.description,
      totalAmount: line.quantity * line.unitFee
    }))
  }
})

async function openShare() {
  if (!success.value || !selectedVehicle.value) return
  preparingShare.value = true
  try {
    if (!success.value.publicToken) {
      const result = await api.post<{ token: string }>(`/vehicles/${selectedVehicle.value.id}/public-link/share`)
      success.value.publicToken = result.token
    }
    showShare.value = true
  } catch (error) {
    toast.error(errorMessage(error))
  } finally {
    preparingShare.value = false
  }
}

async function startNextService() {
  await navigateTo('/service-orders/new', { replace: true })
  step.value = 1
  customerSearch.value = ''
  selectedCustomer.value = null
  selectedVehicle.value = null
  odometer.value = undefined
  suggestedOdometer.value = undefined
  note.value = ''
  discountAmount.value = 0
  products.value = []
  services.value = []
  productSearch.value = ''
  productSuggestionValue.value = {}
  localServiceName.value = ''
  selectedProductIds.value = []
  selectedPendingProductIds.value = []
  selectedServiceIds.value = []
  selectedPendingServiceIds.value = []
  showProduct.value = false
  showProductSuggestion.value = false
  showService.value = false
  showVehicle.value = false
  showCustomer.value = false
  showShare.value = false
  success.value = null
  pendingOrderId.value = ''
  completionKey.value = ''
  pendingOrderSnapshot.value = ''
}
</script>

<template>
  <div ref="pageRoot">
    <header class="mb-6">
      <h1 class="mb-0 mt-1 text-xl font-800">ثبت سرویس جدید</h1>
    </header>

    <div v-if="!success" class="mb-6 flex items-center">
      <template v-for="item in 3" :key="item">
        <div class="flex items-center gap-2">
          <span class="grid h-9 w-9 place-items-center rounded-full text-sm font-700" :class="step >= item ? 'bg-brand-700 text-white' : 'bg-black/6 text-muted'">{{ number(item) }}</span>
          <span class="hidden text-sm font-700 sm:block" :class="step >= item ? 'text-ink' : 'text-muted'">{{ ['مشتری و خودرو', 'اقلام سرویس', 'بررسی نهایی'][item - 1] }}</span>
        </div>
        <div v-if="item < 3" class="mx-3 h-px flex-1" :class="step > item ? 'bg-brand-500' : 'bg-black/10'" />
      </template>
    </div>

    <section v-if="success" class="card mx-auto max-w-2xl overflow-hidden text-center">
      <div class="bg-brand-800 px-6 py-10 text-white">
        <span class="i-lucide-circle-check-big mx-auto block h-16 w-16 text-brand-300" />
        <h2 class="mb-0 mt-5 text-2xl font-800">سرویس با موفقیت ثبت شد</h2>
        <p class="mb-0 mt-2 text-sm text-white/70">فاکتور و سوابق خودرو اکنون به‌روز هستند.</p>
      </div>
      <div class="p-6">
        <div class="mb-6 grid grid-cols-2 gap-3">
          <div class="rounded-xl bg-black/3 p-4"><span class="block text-xs text-muted">شماره فاکتور</span><strong class="mt-1 block">{{ success.invoiceNo }}</strong></div>
          <div class="rounded-xl bg-black/3 p-4"><span class="block text-xs text-muted">مبلغ نهایی</span><strong class="mt-1 block">{{ money(success.totalAmount, success.currency || shopCurrency) }}</strong></div>
        </div>
        <div class="grid gap-2 sm:grid-cols-3">
          <NuxtLink :to="`/invoices/${success.invoiceId}`" class="btn-primary no-underline">مشاهده فاکتور</NuxtLink>
          <button class="btn-secondary" :disabled="preparingShare" @click="openShare">
            <span v-if="preparingShare" class="i-lucide-loader-circle h-4.5 w-4.5 animate-spin" />
            <span v-else class="i-lucide-share-2 h-4.5 w-4.5" />
            {{ preparingShare ? 'آماده‌سازی...' : 'اشتراک‌گذاری' }}
          </button>
          <button type="button" class="btn-ghost" @click="startNextService">سرویس بعدی</button>
        </div>
      </div>
    </section>

    <section v-else-if="step === 1" class="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
      <div class="card p-5">
        <h2 class="m-0 text-base font-700">۱. مشتری را پیدا کنید</h2>
        <div class="relative mt-4">
          <span class="i-lucide-search absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/30" />
          <input v-model="customerSearch" class="field px-10" placeholder="نام، شماره موبایل یا پلاک">
          <button
            v-if="customerSearch"
            type="button"
            class="absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg border-0 bg-black/5 text-muted transition hover:bg-black/10 hover:text-ink"
            aria-label="پاک کردن جست‌وجو"
            title="پاک کردن جست‌وجو"
            @click="customerSearch = ''"
          >
            <span class="i-lucide-x h-4 w-4" />
          </button>
        </div>
        <div class="mt-3 max-h-80 space-y-2 overflow-y-auto">
          <button v-for="customer in customers" :key="customer.id" class="flex w-full items-center gap-3 rounded-xl border p-3 text-right transition" :class="selectedCustomer?.id === customer.id ? 'border-brand-500 bg-brand-50' : 'border-black/6 bg-white hover:border-brand-300'" @click="selectCustomer(customer)">
            <span class="grid h-9 w-9 place-items-center rounded-xl bg-black/4 text-sm font-700">{{ customer.name.slice(0, 1) }}</span>
            <div class="flex-1"><strong class="block text-sm">{{ customer.name }}</strong><span class="mt-0.5 block text-xs text-muted" dir="ltr">{{ customer.mobileDisplay }}</span></div>
            <span class="text-xs text-muted">{{ number(customer.vehicles.length) }} خودرو</span>
          </button>
        </div>
        <button
          type="button"
          class="btn-secondary mt-3 w-full border border-dashed border-brand-300 bg-brand-50/60 py-3 text-brand-800"
          @click="openCustomerModal"
        >
          <span class="i-lucide-user-plus h-5 w-5" />
          اضافه کردن مشتری جدید
        </button>
      </div>

      <div class="card p-5">
        <div class="flex items-center justify-between gap-3">
          <h2 class="m-0 text-base font-700">۲. خودرو و کیلومتر</h2>
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
              <span class="mt-1 block text-xs text-muted">{{ vehicle.plateDisplay || vehicle.temporaryIdentifier || 'بدون پلاک' }}</span>
            </button>
          </div>
          <div v-else class="rounded-xl border border-dashed border-black/10 p-5 text-center text-sm text-muted">
            این مشتری خودرو ندارد.
            <button class="btn-ghost mx-auto mt-2 text-brand-700" @click="openVehicleModal">
              همین‌جا خودرو را اضافه کنید
            </button>
          </div>
          <div class="mt-5">
            <label class="label">کیلومتر فعلی</label>
            <input v-model.number="odometer" type="number" min="0" class="field text-left" dir="ltr" placeholder="126500">
            <p v-if="formattedOdometer(odometer)" class="mb-0 mt-1 text-xs text-muted">
              {{ formattedOdometer(odometer) }}
            </p>
            <p v-if="selectedVehicle?.lastOdometer !== undefined && selectedVehicle?.lastOdometer !== null" class="mb-0 mt-2 text-xs text-muted">
              آخرین کیلومتر ثبت‌شده: <strong>{{ number(selectedVehicle.lastOdometer) }}</strong>
            </p>
            <p v-if="loadingSuggestedOdometer" class="mb-0 mt-2 text-xs text-muted">در حال دریافت موعد سرویس قبلی…</p>
            <div v-else-if="suggestedOdometer" class="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs leading-6 text-emerald-800">
              موعد محاسبه‌شده از سرویس قبلی: <strong>{{ number(suggestedOdometer) }} کیلومتر</strong>
              <span class="block text-emerald-700/70">این مقدار پیشنهادی است؛ در صورت مراجعه زودتر یا دیرتر، کیلومتر واقعی خودرو را وارد کنید.</span>
            </div>
            <p v-else-if="selectedVehicle" class="mb-0 mt-2 text-xs text-muted">برای این خودرو هنوز موعد کیلومتری ثبت نشده است.</p>
          </div>
        </div>
        <div v-else class="mt-4 grid min-h-52 place-items-center rounded-xl bg-black/[.025] text-center text-sm text-muted">ابتدا مشتری را از ستون مقابل انتخاب کنید.</div>
        <button class="btn-primary mt-5 w-full" :disabled="!selectedCustomer || !selectedVehicle" @click="goToItems">ادامه و افزودن اقلام<span class="i-lucide-arrow-left h-4 w-4" /></button>
      </div>
    </section>

    <section v-else-if="step === 2" class="grid gap-5 pb-28 xl:grid-cols-[1fr_1fr] xl:pb-0">
      <div class="space-y-3">
        <header class="card flex items-center justify-between px-5 py-4">
          <div><h2 class="m-0 text-base font-700">محصولات مصرفی</h2><p class="m-0 mt-1 text-xs text-muted">{{ number(products.length) }} قلم</p></div>
          <button class="btn-secondary px-3 py-2" @click="openProductModal"><span class="i-lucide-plus h-4 w-4" />افزودن</button>
        </header>
        <div v-if="products.length" class="grid gap-3">
          <div v-for="(line, index) in products" :key="line.key" class="card p-4">
            <div class="mb-3 flex items-start gap-3">
              <img v-if="line.imageUrl" :src="productImageUrl(line.imageUrl)" :alt="line.description" class="h-16 w-16 shrink-0 object-contain mix-blend-multiply">
              <span v-else-if="line.productId" class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700"><span class="i-lucide-package h-4 w-4" /></span>
              <input v-model="line.description" class="min-w-0 flex-1 border-0 bg-transparent text-sm font-800 outline-none" :readonly="Boolean(line.productId)">
              <button class="btn-ghost h-8 w-8 shrink-0 p-0 text-danger" @click="products.splice(index, 1)"><span class="i-lucide-trash-2 h-4 w-4" /></button>
            </div>
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div><label class="label">تعداد</label><input v-model.number="line.quantity" type="number" min=".001" step=".001" class="field py-2"></div>
              <div>
                <label class="label">قیمت واحد</label>
                <input v-model.number="line.unitPrice" type="number" min="0" class="field py-2">
                <p class="mb-0 mt-1 text-xs text-muted">{{ money(line.unitPrice, shopCurrency) }}</p>
              </div>
              <div>
                <label class="label">تعویض بعد از (کیلومتر)</label>
                <input v-model.number="line.intervalKm" type="number" min="0" step="500" class="field py-2">
                <small v-if="line.intervalKm && odometer !== undefined" class="mt-1 block text-emerald-700">
                  موعد بعدی: {{ number(odometer + line.intervalKm) }} کیلومتر
                </small>
              </div>
            </div>
            <p class="mb-0 mt-3 text-left text-xs font-800 text-brand-700" dir="rtl">{{ money(line.quantity * line.unitPrice, shopCurrency) }}</p>
          </div>
        </div>
        <AppEmptyState v-else class="card" icon="i-lucide-package-open" title="محصولی اضافه نشده" />
      </div>

      <div class="space-y-3">
        <header class="card flex items-center justify-between px-5 py-4">
          <div><h2 class="m-0 text-base font-700">خدمات و اجرت</h2><p class="m-0 mt-1 text-xs text-muted">{{ number(services.length) }} خدمت</p></div>
          <button class="btn-secondary px-3 py-2" @click="openServiceModal"><span class="i-lucide-plus h-4 w-4" />افزودن</button>
        </header>
        <div v-if="services.length" class="grid gap-3">
          <div v-for="(line, index) in services" :key="line.key" class="card p-4">
            <div class="mb-3 flex items-start justify-between gap-3"><input v-model="line.description" class="min-w-0 flex-1 border-0 bg-transparent text-sm font-800 outline-none" :readonly="Boolean(line.serviceId)"><button class="btn-ghost h-8 w-8 p-0 text-danger" @click="services.splice(index, 1)"><span class="i-lucide-trash-2 h-4 w-4" /></button></div>
            <div class="grid grid-cols-2 gap-2">
              <div><label class="label">تعداد</label><input v-model.number="line.quantity" type="number" min=".001" step=".001" class="field py-2"></div>
              <div>
                <label class="label">اجرت واحد</label>
                <input v-model.number="line.unitFee" type="number" min="0" class="field py-2">
                <p class="mb-0 mt-1 text-xs text-muted">{{ money(line.unitFee, shopCurrency) }}</p>
              </div>
            </div>
            <p class="mb-0 mt-3 text-left text-xs font-800 text-brand-700" dir="rtl">{{ money(line.quantity * line.unitFee, shopCurrency) }}</p>
          </div>
        </div>
        <AppEmptyState v-else class="card" icon="i-lucide-wrench" title="خدمتی اضافه نشده" />
      </div>

      <div class="fixed inset-x-3 bottom-[5.5rem] z-30 flex flex-col gap-3 rounded-2xl border border-black/8 bg-white/95 p-3 shadow-[0_16px_45px_rgba(16,32,25,.18)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-4 lg:sticky lg:inset-x-auto lg:bottom-4 xl:col-span-2">
        <div class="flex items-center justify-between gap-3 sm:block">
          <span class="text-xs text-muted sm:block">جمع فعلی</span>
          <strong class="text-lg text-ink">{{ money(grandTotal, shopCurrency) }}</strong>
        </div>
        <div class="grid grid-cols-[auto_1fr] gap-2 sm:flex">
          <button
            type="button"
            class="btn-secondary px-3 active:!border-brand-300 active:!bg-brand-50 active:!text-brand-800"
            @click="step = 1"
          >
            <span class="i-lucide-arrow-right h-4 w-4" />
            مرحله قبل
          </button>
          <button type="button" class="btn-primary min-w-0 sm:min-w-40" @click="goToReview">
            بررسی نهایی
            <span class="i-lucide-arrow-left h-4 w-4" />
          </button>
        </div>
      </div>
    </section>

    <section v-else class="mx-auto max-w-3xl">
      <div class="card overflow-hidden">
        <header class="bg-ink p-5 text-white sm:p-6">
          <p class="m-0 text-xs text-white/70">مرور نهایی سرویس</p>
          <div class="mt-2 flex items-end justify-between gap-4"><h2 class="m-0 text-xl font-800">{{ selectedCustomer?.name }}</h2><strong class="text-brand-300">{{ selectedVehicle?.plateDisplay || selectedVehicle?.temporaryIdentifier || 'بدون پلاک' }}</strong></div>
          <p class="mb-0 mt-2 text-sm text-white/70">{{ number(odometer) }} کیلومتر</p>
        </header>
        <div class="p-5 sm:p-6">
          <div class="space-y-3">
            <div v-for="line in products" :key="line.key" class="flex items-center justify-between gap-3 text-sm"><span class="text-ink/65">{{ line.description }} × {{ number(line.quantity) }}</span><strong>{{ money(line.quantity * line.unitPrice, shopCurrency) }}</strong></div>
            <div v-for="line in services" :key="line.key" class="flex items-center justify-between gap-3 text-sm"><span class="text-ink/65">{{ line.description }} × {{ number(line.quantity) }}</span><strong>{{ money(line.quantity * line.unitFee, shopCurrency) }}</strong></div>
          </div>
          <div class="my-5 border-t border-dashed border-black/10" />
          <div class="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <label class="label">تخفیف فاکتور <span class="font-400 text-muted">({{ currencyLabel }})</span></label>
              <input v-model.number="discountAmount" type="number" min="0" :max="grandTotal" class="field text-left" dir="ltr">
              <p v-if="discountAmount" class="mb-0 mt-1 text-xs text-muted">{{ money(discountAmount, shopCurrency) }}</p>
            </div>
            <div class="rounded-xl bg-brand-50 px-4 py-3 sm:min-w-52">
              <div v-if="discountAmount" class="mb-1 flex items-center justify-between gap-4 text-xs text-muted"><span>جمع اقلام</span><span>{{ money(grandTotal, shopCurrency) }}</span></div>
              <div class="flex items-center justify-between gap-4"><span class="font-800">قابل پرداخت</span><strong class="text-xl font-800 text-brand-700">{{ money(payableTotal, shopCurrency) }}</strong></div>
            </div>
          </div>
          <div class="mt-5"><label class="label">یادداشت سرویس</label><textarea v-model="note" class="field min-h-24" placeholder="مثلاً بررسی سطح ضدیخ در مراجعه بعد..." /></div>
          <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button class="btn-ghost" @click="step = 2">بازگشت و ویرایش</button>
            <button class="btn-primary min-w-44" :disabled="submitting" @click="completeOrder"><span v-if="submitting" class="i-lucide-loader-circle animate-spin" /><span v-else class="i-lucide-circle-check" />نهایی‌سازی سرویس</button>
          </div>
        </div>
      </div>
    </section>

    <PublicBookShareModal
      :open="showShare"
      :url="publicBookLink"
      :message="shareMessage"
      :card="serviceShareCard"
      :customer-mobile="selectedCustomer?.mobileNormalized"
      @close="showShare = false"
    />

    <AppModal
      :open="showCustomer"
      title="افزودن مشتری جدید"
      description="مشتری پس از ثبت به‌صورت خودکار برای این سفارش انتخاب می‌شود."
      @close="showCustomer = false"
    >
      <form class="space-y-4" @submit.prevent="createCustomer">
        <div>
          <label class="label">شماره موبایل</label>
          <input
            v-model="customerForm.mobile"
            class="field text-left"
            dir="ltr"
            inputmode="tel"
            autocomplete="tel"
            placeholder="09120000000"
            required
            autofocus
          >
          <p v-if="customerForm.mobile" class="mb-0 mt-2 text-xs text-muted">شماره از جست‌وجوی شما وارد شده و قابل ویرایش است.</p>
        </div>
        <div>
          <label class="label">جنسیت</label>
          <div class="grid grid-cols-2 gap-2">
            <label class="flex cursor-pointer items-center justify-center gap-2 rounded-xl border p-3" :class="customerForm.gender === 'male' ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-black/7'">
              <input v-model="customerForm.gender" type="radio" value="male" class="accent-brand-600"> آقا
            </label>
            <label class="flex cursor-pointer items-center justify-center gap-2 rounded-xl border p-3" :class="customerForm.gender === 'female' ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-black/7'">
              <input v-model="customerForm.gender" type="radio" value="female" class="accent-brand-600"> خانم
            </label>
          </div>
        </div>
        <div>
          <label class="label">نام و نام خانوادگی <span class="font-400 text-muted">(اختیاری)</span></label>
          <input v-model="customerForm.name" class="field" autocomplete="name" placeholder="در صورت تمایل وارد کنید">
        </div>
        <div>
          <label class="label">یادداشت <span class="font-400 text-muted">(اختیاری)</span></label>
          <textarea v-model="customerForm.note" class="field min-h-20 resize-y" />
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="btn-ghost" :disabled="savingCustomer" @click="showCustomer = false">انصراف</button>
          <button class="btn-primary" :disabled="savingCustomer">
            <span v-if="savingCustomer" class="i-lucide-loader-circle h-4 w-4 animate-spin" />
            {{ savingCustomer ? 'در حال ثبت…' : 'ثبت و انتخاب مشتری' }}
          </button>
        </div>
      </form>
    </AppModal>

<AppModal
  :open="showProduct"
  title="افزودن محصول"
  description="فقط محصولات فعال فروشگاه نمایش داده می‌شوند و گزینه‌های سازگار با خودرو در ابتدای فهرست هستند."
  @close="showProduct = false"
>
  <!-- Search: ثابت بالا -->
  <div class="shrink-0 pb-3">
    <div class="relative">
      <span
        class="i-lucide-search absolute right-3 top-1/2 -translate-y-1/2 text-ink/30"
      />

      <input
        v-model="productSearch"
        class="field pr-9"
        placeholder="نام واقعی محصول، برند یا ویژگی..."
      >
    </div>

    <div
      v-if="compatibleProductCount"
      class="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800"
    >
      {{ number(compatibleProductCount) }}
      محصول مناسب این مدل خودرو پیدا شد.
    </div>
  </div>

  <!-- بخش اسکرولی -->
  <div
    class="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1"
  >
    <!-- محصولات -->
    <div class="space-y-2">
      <button
        type="button"
        v-for="product in selectableProducts"
        :key="product.id"
        class="flex w-full items-center justify-between rounded-xl border p-3 text-right hover:border-brand-300 hover:bg-brand-50"
        :class="
          selectedProductIds.includes(product.id)
            ? 'border-brand-500 bg-brand-50'
            : product.compatibility?.status === 'compatible'
              ? 'border-emerald-200 bg-emerald-50/40'
              : 'border-black/7'
        "
        @click="toggleSelection(selectedProductIds, product.id)"
      >
        <div class="flex min-w-0 flex-1 items-center gap-3">
          <img v-if="product.imageUrl" :src="productImageUrl(product.imageUrl)" :alt="product.displayName" class="h-20 w-20 shrink-0 object-contain mix-blend-multiply">
          <div v-else class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-black/[.04]"><span class="i-lucide-package h-4.5 w-4.5 text-ink/30" /></div>
          <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <strong class="block text-sm">
              {{ product.displayName }}
            </strong>

            <span
              v-if="product.compatibility?.status === 'compatible'"
              class="badge bg-emerald-100 text-[10px] text-emerald-800"
            >
              سازگار
            </span>
          </div>

          <span class="mt-1 block text-xs text-muted">
            {{
              product.shopConfiguration?.salePrice
                ? money(product.shopConfiguration.salePrice, shopCurrency)
                : 'قیمت تعیین نشده'
            }}

            <template v-if="productDefaultIntervalKm(product)">
              · تعویض هر
              {{ number(productDefaultIntervalKm(product)) }}
              کیلومتر
            </template>

            <template v-if="product.attributes?.model">
              · مدل {{ product.attributes.model }}
            </template>

            <template v-if="product.attributes?.package_volume">
              · حجم {{ product.attributes.package_volume }}
            </template>
          </span>
          </div>
        </div>

        <span
          :class="
            selectedProductIds.includes(product.id)
              ? 'i-lucide-check text-brand-700'
              : 'i-lucide-plus text-brand-600'
          "
          class="h-5 w-5 shrink-0"
        />
      </button>
    </div>

    <!-- Pending products -->
    <div
      v-if="pendingProductSuggestions.length"
      class="mt-3 border-t border-black/7 pt-3"
    >
      <p class="mb-2 mt-0 text-xs font-800 text-amber-700">
        محصولات خارج از کاتالوگ در انتظار بررسی
      </p>

      <div class="space-y-2">
        <button
          type="button"
          v-for="item in pendingProductSuggestions"
          :key="item.id"
          class="flex w-full items-center justify-between rounded-xl border p-3 text-right hover:bg-amber-50"
          :class="
            selectedPendingProductIds.includes(item.id)
              ? 'border-brand-500 bg-brand-50'
              : 'border-amber-200 bg-amber-50/60'
          "
          @click="toggleSelection(selectedPendingProductIds, item.id)"
        >
          <div class="min-w-0">
            <strong class="block text-sm">
              {{ item.payload.description }}
            </strong>

            <span class="mt-1 block text-xs text-amber-700/70">
              قابل استفاده تا زمان بررسی مدیر
            </span>
          </div>

          <span
            :class="
              selectedPendingProductIds.includes(item.id)
                ? 'i-lucide-check text-brand-700'
                : 'i-lucide-plus text-amber-700'
            "
            class="h-5 w-5 shrink-0"
          />
        </button>
      </div>
    </div>

    <!-- پیشنهاد محصول -->
    <div
      class="mt-3 rounded-xl border border-dashed border-black/10 bg-black/[.02] p-3"
    >
      <p class="m-0 text-xs leading-6 text-muted">
        محصول پیدا نشد؟ مشخصات آن را ثبت کنید تا برای بررسی مدیر ارسال و
        هم‌زمان به این فاکتور افزوده شود.
      </p>

      <button
        class="btn-ghost mt-2 w-full"
        @click="openProductSuggestionModal"
      >
        <span class="i-lucide-lightbulb" />
        ثبت پیشنهاد محصول
      </button>
    </div>
  </div>

  <!-- Footer: ثابت پایین -->
  <div
    class="shrink-0 border-t border-black/7 bg-surface pt-3"
  >
      <button
        type="button"
        class="btn-primary w-full"
        :disabled="!selectedProductCount"
        @click="confirmProducts"
      >
        {{ selectedProductCount ? `تأیید و افزودن ${number(selectedProductCount)} مورد` : 'یک محصول انتخاب کنید' }}
      </button>
  </div>
</AppModal>

    <ProductEditorModal
      :open="showProductSuggestion"
      title="ثبت پیشنهاد محصول"
      description="مشخصات محصول را وارد کنید؛ محصول پیشنهادی همین حالا با قیمت قابل‌ویرایش به فاکتور اضافه می‌شود."
      submit-label="ثبت پیشنهاد و افزودن به فاکتور"
      :saving="savingProductSuggestion"
      :value="productSuggestionValue"
      :product-types="productTypes || []"
      :vehicle-models="vehicleModels || []"
      @close="showProductSuggestion = false"
      @submit="submitProductSuggestion"
    />

    <AppModal :open="showService" title="افزودن خدمت" description="خدمت استاندارد را انتخاب کنید یا نام خدمت خارج از کاتالوگ را بنویسید." @close="showService = false">
      <div class="max-h-80 space-y-2 overflow-y-auto">
        <button v-for="service in selectableServices" :key="service.id" class="flex w-full items-center justify-between rounded-xl border p-3 text-right hover:border-brand-300 hover:bg-brand-50" :class="selectedServiceIds.includes(service.id) ? 'border-brand-500 bg-brand-50' : 'border-black/7'" @click="toggleSelection(selectedServiceIds, service.id)">
          <div><strong class="block text-sm">{{ service.name }}</strong><span class="mt-1 block text-xs text-muted">{{ service.category || 'خدمت عمومی' }}</span></div>
          <span :class="selectedServiceIds.includes(service.id) ? 'i-lucide-check text-brand-700' : 'i-lucide-plus text-brand-600'" class="h-5 w-5" />
        </button>
      </div>
      <div v-if="pendingServiceSuggestions.length" class="mt-3 border-t border-black/7 pt-3">
        <p class="mb-2 mt-0 text-xs font-800 text-amber-700">خدمات خارج از کاتالوگ در انتظار بررسی</p>
        <div class="space-y-2">
          <button
            v-for="item in pendingServiceSuggestions"
            :key="item.id"
            class="flex w-full items-center justify-between rounded-xl border p-3 text-right hover:bg-amber-50"
            :class="selectedPendingServiceIds.includes(item.id) ? 'border-brand-500 bg-brand-50' : 'border-amber-200 bg-amber-50/60'"
            @click="toggleSelection(selectedPendingServiceIds, item.id)"
          >
            <div><strong class="block text-sm">{{ item.payload.description }}</strong><span class="mt-1 block text-xs text-amber-700/70">قابل استفاده تا زمان بررسی مدیر</span></div>
            <span :class="selectedPendingServiceIds.includes(item.id) ? 'i-lucide-check text-brand-700' : 'i-lucide-plus text-amber-700'" class="h-5 w-5" />
          </button>
        </div>
      </div>
      <div class="mt-3 rounded-xl border border-dashed border-black/10 bg-black/[.02] p-3">
        <label class="label" for="local-service-name">نام خدمت خارج از کاتالوگ</label>
        <div class="flex gap-2">
          <input id="local-service-name" v-model="localServiceName" class="field" placeholder="مثلاً شست‌وشوی انژکتور" @keyup.enter="addLocalService">
          <button class="btn-ghost shrink-0" :disabled="!localServiceName.trim()" @click="addLocalService"><span class="i-lucide-file-plus" />افزودن</button>
        </div>
        <p class="mb-0 mt-2 text-xs leading-5 text-muted">این نام در سفارش ثبت و برای تکمیل کاتالوگ به مدیر پیشنهاد می‌شود.</p>
      </div>
      <div class="mt-4 flex justify-end">
        <button class="btn-primary" @click="confirmServices">تأیید و افزودن</button>
      </div>
    </AppModal>

    <AppModal
      :open="showVehicle"
      title="افزودن خودرو"
      description="مدل خودرو را جستجو کنید؛ برند آن خودکار تشخیص داده می‌شود و خودرو بعد از ثبت انتخاب خواهد شد."
      @close="showVehicle = false"
    >
      <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="createVehicle">
        <VehicleModelPicker v-model="vehicleForm.modelId" :models="vehicleModels || []" class="sm:col-span-2" />
        <div class="sm:col-span-2">
          <label class="label">کیلومتر فعلی</label>
          <input v-model.number="vehicleForm.lastOdometer" type="number" min="0" class="field text-left" dir="ltr" placeholder="126500">
          <p v-if="formattedOdometer(vehicleForm.lastOdometer)" class="mb-0 mt-1 text-xs text-muted">
            {{ formattedOdometer(vehicleForm.lastOdometer) }}
          </p>
        </div>
        <div class="sm:col-span-2">
          <label class="label">پلاک خودرو <span class="font-400 text-muted">(اختیاری)</span></label>
          <IranianPlateInput v-model="vehicleForm.plate" @incomplete-change="plateIncomplete = $event" />
        </div>
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
