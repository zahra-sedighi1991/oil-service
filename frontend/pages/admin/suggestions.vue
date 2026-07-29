<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'admin'] })
useHead({ title: 'بررسی پیشنهادها' })

const api = useApi()
const toast = useToast()
const { dateTime, errorMessage } = useFormat()

type Decision = 'approved' | 'rejected' | 'merged'
interface Suggestion {
  id: string
  shopId: string
  entityType: string
  payload: Record<string, unknown>
  status: 'pending' | Decision
  createdAt: string
  decisionNote?: string
  mappedEntityId?: string
}
interface CatalogOption { id: string; displayName?: string; name?: string }

const statusFilter = ref<'all' | Suggestion['status']>('pending')
const selected = ref<Suggestion | null>(null)
const decision = ref<Decision>('approved')
const decisionNote = ref('')
const mappedEntityId = ref('')
const serviceCategory = ref('')
const catalogName = ref('')
const submitting = ref(false)

const { data: suggestions, pending, refresh } = await useAsyncData(
  'admin-suggestions',
  () => api.get<Suggestion[]>('/admin/suggestions'),
)
const { data: catalogProducts, refresh: refreshProducts } = await useAsyncData(
  'suggestion-catalog-products',
  () => api.get<CatalogOption[]>('/catalog/products'),
)
const { data: catalogServices, refresh: refreshServices } = await useAsyncData(
  'suggestion-catalog-services',
  () => api.get<CatalogOption[]>('/catalog/services'),
)

const filteredSuggestions = computed(() => {
  if (statusFilter.value === 'all') return suggestions.value || []
  return (suggestions.value || []).filter(item => item.status === statusFilter.value)
})

const counts = computed(() => ({
  all: suggestions.value?.length || 0,
  pending: suggestions.value?.filter(item => item.status === 'pending').length || 0,
  approved: suggestions.value?.filter(item => item.status === 'approved').length || 0,
  merged: suggestions.value?.filter(item => item.status === 'merged').length || 0,
  rejected: suggestions.value?.filter(item => item.status === 'rejected').length || 0,
}))

const statusMeta: Record<Suggestion['status'], { label: string; class: string }> = {
  pending: { label: 'در انتظار بررسی', class: 'bg-amber-50 text-amber-700' },
  approved: { label: 'تأیید شده', class: 'bg-emerald-50 text-emerald-700' },
  merged: { label: 'ادغام شده', class: 'bg-sky-50 text-sky-700' },
  rejected: { label: 'رد شده', class: 'bg-red-50 text-danger' },
}

const decisionMeta: Record<Decision, { title: string; description: string; submit: string }> = {
  approved: {
    title: 'تأیید پیشنهاد',
    description: 'این پیشنهاد به‌عنوان یک مورد معتبر پذیرفته و برای تکمیل کاتالوگ ثبت می‌شود.',
    submit: 'تأیید نهایی',
  },
  merged: {
    title: 'ادغام با مورد موجود',
    description: 'اگر همین محصول یا خدمت از قبل وجود دارد، شناسهٔ مورد مقصد را وارد کنید.',
    submit: 'ثبت ادغام',
  },
  rejected: {
    title: 'رد پیشنهاد',
    description: 'دلیل رد برای پیگیری و شفافیت فروشگاه ثبت می‌شود.',
    submit: 'رد پیشنهاد',
  },
}

function entityLabel(type: string) {
  return ({ product: 'محصول', service: 'خدمت' } as Record<string, string>)[type] || 'مورد کاتالوگ'
}

function suggestionTitle(item: Suggestion) {
  const value = item.payload.description || item.payload.name || item.payload.title
  return typeof value === 'string' && value.trim() ? value : `پیشنهاد ${entityLabel(item.entityType)}`
}

function openDecision(item: Suggestion, value: Decision) {
  selected.value = item
  decision.value = value
  mappedEntityId.value = ''
  serviceCategory.value = ''
  catalogName.value = suggestionTitle(item)
  decisionNote.value = value === 'approved' ? 'پیشنهاد بررسی و تأیید شد.' : ''
}

function closeDecision() {
  if (submitting.value) return
  selected.value = null
}

async function submitDecision() {
  if (!selected.value) return
  if (!decisionNote.value.trim()) {
    toast.error('لطفاً یادداشت یا دلیل تصمیم را وارد کنید.')
    return
  }
  if (decision.value === 'merged' && !mappedEntityId.value.trim()) {
    toast.error('شناسهٔ موردی که پیشنهاد باید با آن ادغام شود الزامی است.')
    return
  }
  if (decision.value === 'approved' && !catalogName.value.trim()) {
    toast.error('نام نهایی کاتالوگ الزامی است.')
    return
  }

  submitting.value = true
  try {
    await api.patch(`/admin/suggestions/${selected.value.id}`, {
      status: decision.value,
      decisionNote: decisionNote.value.trim(),
      ...(decision.value === 'merged' ? { mappedEntityId: mappedEntityId.value.trim() } : {}),
      ...(decision.value === 'approved' && selected.value.entityType === 'product'
        ? { catalogName: catalogName.value.trim() }
        : {}),
      ...(decision.value === 'approved' && selected.value.entityType === 'service'
        ? { catalogName: catalogName.value.trim(), ...(serviceCategory.value.trim() ? { category: serviceCategory.value.trim() } : {}) }
        : {}),
    })
    toast.success('تصمیم با موفقیت ثبت شد.')
    selected.value = null
    await Promise.all([refresh(), refreshProducts(), refreshServices()])
  } catch (error) {
    toast.error(errorMessage(error))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="list-page">
    <header class="mb-6">
      <p class="m-0 text-sm font-700 text-brand-700">مدیریت کاتالوگ</p>
      <h1 class="mb-0 mt-1 text-2xl font-950">پیشنهادهای محصولات و خدمات</h1>
      <p class="mb-0 mt-2 max-w-2xl text-sm leading-7 text-ink/50">
        وقتی فروشگاه هنگام ثبت سفارش موردی را پیدا نمی‌کند، آن را به‌صورت «خارج از کاتالوگ» ثبت می‌کند.
        این موارد برای تأیید، اتصال به مورد موجود یا رد شدن در این صف قرار می‌گیرند.
      </p>
    </header>

    <nav class="mb-4 flex flex-wrap gap-2" aria-label="فیلتر وضعیت پیشنهادها">
      <button
        v-for="filter in ([
          ['pending', 'در انتظار'], ['all', 'همه'], ['approved', 'تأییدشده'],
          ['merged', 'ادغام‌شده'], ['rejected', 'ردشده'],
        ] as const)"
        :key="filter[0]"
        class="rounded-xl border px-3 py-2 text-sm font-700 transition"
        :class="statusFilter === filter[0] ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-black/10 bg-white text-ink/55 hover:border-brand-200'"
        @click="statusFilter = filter[0]"
      >
        {{ filter[1] }}
        <span class="mr-1 text-xs opacity-60">{{ counts[filter[0]] }}</span>
      </button>
    </nav>

    <section class="card list-panel">
      <div v-if="pending" class="p-8 text-center text-sm text-ink/45">در حال دریافت پیشنهادها…</div>
      <div v-else-if="filteredSuggestions.length" class="scroll-container list-scroll divide-y divide-black/5">
        <article v-for="item in filteredSuggestions" :key="item.id" class="p-5">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
            <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
              <span class="i-lucide-lightbulb h-5 w-5" />
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <strong class="text-sm">{{ suggestionTitle(item) }}</strong>
                <span class="badge" :class="statusMeta[item.status].class">{{ statusMeta[item.status].label }}</span>
              </div>
              <span class="mt-2 block text-xs text-ink/45">
                {{ entityLabel(item.entityType) }} · ثبت‌شده در {{ dateTime(item.createdAt) }}
              </span>
              <div v-if="item.decisionNote" class="mt-3 rounded-xl bg-black/[.025] px-3 py-2 text-xs leading-6 text-ink/60">
                <strong>یادداشت تصمیم:</strong> {{ item.decisionNote }}
                <span v-if="item.mappedEntityId" class="mr-2">· شناسه مقصد: {{ item.mappedEntityId }}</span>
              </div>
            </div>
            <div v-if="item.status === 'pending'" class="flex shrink-0 flex-wrap gap-2">
              <button class="btn-primary px-3 py-2" @click="openDecision(item, 'approved')">
                <span class="i-lucide-check h-4 w-4" /> تأیید
              </button>
              <button class="btn-secondary px-3 py-2" @click="openDecision(item, 'merged')">
                <span class="i-lucide-git-merge h-4 w-4" /> ادغام
              </button>
              <button class="btn-ghost px-3 py-2 text-danger" @click="openDecision(item, 'rejected')">
                <span class="i-lucide-x h-4 w-4" /> رد
              </button>
            </div>
          </div>
        </article>
      </div>
      <AppEmptyState
        v-else
        icon="i-lucide-inbox"
        title="پیشنهادی در این وضعیت نیست"
        description="با انتخاب وضعیت دیگری می‌توانید پیشنهادهای قبلی را ببینید."
      />
    </section>

    <AppModal
      :open="Boolean(selected)"
      :title="decisionMeta[decision].title"
      :description="decisionMeta[decision].description"
      @close="closeDecision"
    >
      <form class="space-y-4" @submit.prevent="submitDecision">
        <div class="rounded-xl bg-black/[.025] p-3">
          <span class="block text-xs text-ink/45">پیشنهاد انتخاب‌شده</span>
          <strong class="mt-1 block text-sm">{{ selected ? suggestionTitle(selected) : '' }}</strong>
        </div>
        <div v-if="decision === 'approved'">
          <label class="label" for="catalog-name">نام نهایی در کاتالوگ</label>
          <input id="catalog-name" v-model="catalogName" class="field" required placeholder="نامی که کاربران در لیست خواهند دید">
          <p class="mb-0 mt-2 text-xs leading-5 text-ink/45">در صورت نیاز نام پیشنهادی را اصلاح کنید؛ همین نام در لیست محصولات یا خدمات نمایش داده می‌شود.</p>
        </div>
        <div v-if="decision === 'approved' && selected?.entityType === 'service'">
          <label class="label" for="service-category">دسته خدمت (اختیاری)</label>
          <input id="service-category" v-model="serviceCategory" class="field" placeholder="مثلاً تعمیرات موتور">
          <p class="mb-0 mt-2 text-xs leading-5 text-ink/45">خدمت با نام پیشنهادی در کاتالوگ ساخته و برای فروشگاه فعال می‌شود.</p>
        </div>
        <div v-if="decision === 'merged'">
          <label class="label" for="mapped-entity-id">{{ selected?.entityType === 'product' ? 'محصول موجود' : 'خدمت موجود' }}</label>
          <select
            id="mapped-entity-id"
            v-model="mappedEntityId"
            class="field"
            required
          >
            <option value="" disabled>انتخاب مورد مقصد</option>
            <option
              v-for="option in (selected?.entityType === 'product' ? catalogProducts : catalogServices) || []"
              :key="option.id"
              :value="option.id"
            >{{ option.displayName || option.name }}</option>
          </select>
          <p class="mb-0 mt-1 text-xs leading-5 text-ink/45">پیشنهاد به این مورد موجود متصل می‌شود و مورد تکراری ساخته نخواهد شد.</p>
        </div>
        <div>
          <label class="label" for="decision-note">{{ decision === 'rejected' ? 'دلیل رد' : 'یادداشت تصمیم' }}</label>
          <textarea
            id="decision-note"
            v-model="decisionNote"
            class="field min-h-24 resize-y"
            :placeholder="decision === 'rejected' ? 'مثلاً: اطلاعات کافی نیست یا مورد نامعتبر است' : 'توضیح کوتاهی درباره این تصمیم'"
          />
        </div>
        <div class="flex justify-end gap-2 pt-1">
          <button type="button" class="btn-ghost" :disabled="submitting" @click="closeDecision">انصراف</button>
          <button
            type="submit"
            class="btn-primary"
            :class="decision === 'rejected' ? '!bg-danger' : ''"
            :disabled="submitting"
          >
            <span v-if="submitting" class="i-lucide-loader-circle h-4 w-4 animate-spin" />
            {{ submitting ? 'در حال ثبت…' : decisionMeta[decision].submit }}
          </button>
        </div>
      </form>
    </AppModal>
  </div>
</template>
