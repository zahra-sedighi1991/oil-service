<script setup lang="ts">
interface VehicleModelOption {
  id: string
  brandId: string
  nameFa: string
  isPopular: boolean
  brand?: { id: string; nameFa: string }
}

const props = defineProps<{
  modelValue: string
  models: VehicleModelOption[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const search = ref('')
const open = ref(false)
const inputId = useId()

function normalize(value: string) {
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹'
  const englishDigits = '0123456789'
  return value
    .toLocaleLowerCase('fa')
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[0-9]/g, digit => persianDigits[englishDigits.indexOf(digit)])
    .replace(/\s+/g, ' ')
    .trim()
}

function modelLabel(model: VehicleModelOption) {
  return model.brand?.nameFa ? `${model.nameFa} · ${model.brand.nameFa}` : model.nameFa
}

const popularModels = computed(() => props.models
  .filter(model => model.isPopular)
  .sort((a, b) => a.nameFa.localeCompare(b.nameFa, 'fa')))

const filteredModels = computed(() => {
  const query = normalize(search.value)
  if (!query) return []
  return props.models
    .filter(model => normalize(modelLabel(model)).includes(query))
    .sort((a, b) => a.nameFa.localeCompare(b.nameFa, 'fa'))
    .slice(0, 12)
})

watch(() => props.modelValue, (id, previousId) => {
  if (id) return
  const previousModel = props.models.find(model => model.id === previousId)
  if (!previousModel || normalize(search.value) === normalize(modelLabel(previousModel))) {
    search.value = ''
  }
})

function selectModel(model: VehicleModelOption) {
  emit('update:modelValue', model.id)
  search.value = modelLabel(model)
  open.value = false
}

function onSearchInput() {
  if (props.modelValue) emit('update:modelValue', '')
  open.value = true
}

function clearSelection() {
  search.value = ''
  emit('update:modelValue', '')
  open.value = false
}

function onFocusOut(event: FocusEvent) {
  const container = event.currentTarget as HTMLElement
  const next = event.relatedTarget as Node | null
  if (!next || !container.contains(next)) open.value = false
}
</script>

<template>
  <div @focusout="onFocusOut">
    <label class="label" :for="inputId">مدل خودرو</label>

    <div class="relative">
      <div class="relative overflow-hidden rounded-2xl border border-black/8 bg-white focus-within:border-brand-400 focus-within:ring-3 focus-within:ring-brand-100">
        <span class="i-lucide-search absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
        <input
          :id="inputId"
          v-model="search"
          class="w-full border-0 bg-transparent py-3.5 pl-11 pr-11 text-sm outline-none"
          placeholder="جستجوی مدل؛ مثلاً پراید یا پژو ۲۰۶"
          autocomplete="off"
          role="combobox"
          :aria-expanded="open && Boolean(search.trim())"
          aria-autocomplete="list"
          @focus="open = true"
          @input="onSearchInput"
        >
        <button
          v-if="search"
          type="button"
          class="absolute left-2.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg border-0 bg-black/5 text-muted hover:bg-black/10"
          aria-label="پاک کردن انتخاب مدل"
          @click="clearSelection"
        >
          <span class="i-lucide-x h-4 w-4" />
        </button>
      </div>

      <div
        v-if="open && search.trim()"
        class="scroll-container absolute inset-x-0 top-[calc(100%+0.5rem)] z-30 max-h-56 overflow-y-auto rounded-2xl border border-black/8 bg-white p-2 shadow-2xl"
        role="listbox"
      >
        <button
          v-for="model in filteredModels"
          :key="model.id"
          type="button"
          class="flex w-full items-center justify-between rounded-xl border-0 bg-transparent px-3 py-3 text-right text-sm text-ink transition hover:bg-brand-50"
          role="option"
          :aria-selected="modelValue === model.id"
          @click="selectModel(model)"
        >
          <span>
            <strong>{{ model.nameFa }}</strong>
            <small v-if="model.brand?.nameFa" class="mr-2 text-muted">{{ model.brand.nameFa }}</small>
          </span>
          <span v-if="modelValue === model.id" class="i-lucide-check h-4.5 w-4.5 text-brand-600" />
        </button>
        <p v-if="!filteredModels.length" class="my-6 text-center text-sm text-muted">
          مدلی با این نام پیدا نشد.
        </p>
      </div>
    </div>

    <div v-if="popularModels.length" class="mt-3">
      <span class="mb-2 block text-xs font-700 text-muted">مدل‌های پرکاربرد</span>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="model in popularModels"
          :key="`popular-${model.id}`"
          type="button"
          class="rounded-xl border px-3 py-2 text-xs font-700 transition"
          :class="modelValue === model.id ? 'border-brand-500 bg-brand-500 text-ink' : 'border-brand-200 bg-brand-50 text-brand-800 hover:border-brand-400'"
          @click="selectModel(model)"
        >
          {{ model.nameFa }}
        </button>
      </div>
    </div>

    <p v-if="!models.length" class="mb-0 mt-2 text-xs text-amber-700">هنوز مدل خودرویی در اطلاعات پایه ثبت نشده است.</p>
  </div>
</template>
