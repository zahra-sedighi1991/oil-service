<script setup lang="ts">
const props = defineProps<{ modelValue?: string }>()
const emit = defineEmits<{
  'update:modelValue': [value: string]
  'incomplete-change': [value: boolean]
}>()

const letters = ['الف', 'ب', 'پ', 'ت', 'ث', 'ج', 'د', 'ز', 'ژ', 'س', 'ش', 'ص', 'ط', 'ع', 'ف', 'ق', 'ک', 'گ', 'ل', 'م', 'ن', 'و', 'ه', 'ی']
const first = ref('')
const letter = ref('')
const middle = ref('')
const region = ref('')
const letterInput = ref<HTMLInputElement | null>(null)
const middleInput = ref<HTMLInputElement | null>(null)
const regionInput = ref<HTMLInputElement | null>(null)
let emitting = false

function englishDigits(value: string) {
  const persian = '۰۱۲۳۴۵۶۷۸۹'
  const arabic = '٠١٢٣٤٥٦٧٨٩'
  return value
    .replace(/[۰-۹]/g, digit => String(persian.indexOf(digit)))
    .replace(/[٠-٩]/g, digit => String(arabic.indexOf(digit)))
}

function parsePlate(value: string) {
  const normalized = englishDigits(value)
    .replace(/ایران/gi, '')
    .replace(/[\s-]/g, '')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
  const match = normalized.match(/^(\d{2})(الف|[آ-ی])(\d{3})(\d{2})$/)
  return match && letters.includes(match[2]) ? match : null
}

function setFromValue(value?: string) {
  if (!value) {
    first.value = ''
    letter.value = ''
    middle.value = ''
    region.value = ''
    return
  }
  const match = parsePlate(value)
  if (!match) return
  first.value = match[1]
  letter.value = match[2]
  middle.value = match[3]
  region.value = match[4]
}

watch(() => props.modelValue, (value) => {
  if (!emitting) setFromValue(value)
}, { immediate: true })

watch([first, letter, middle, region], () => {
  const complete = first.value.length === 2 && letters.includes(letter.value) && middle.value.length === 3 && region.value.length === 2
  const hasValue = Boolean(first.value || letter.value || middle.value || region.value)
  emitting = true
  emit('update:modelValue', complete ? `${first.value}${letter.value}${middle.value}ایران${region.value}` : '')
  emit('incomplete-change', hasValue && !complete)
  nextTick(() => { emitting = false })
})

const partial = computed(() => Boolean(first.value || letter.value || middle.value || region.value)
  && !(first.value.length === 2 && letters.includes(letter.value) && middle.value.length === 3 && region.value.length === 2))

function digitsFromEvent(event: Event, target: 'first' | 'middle' | 'region') {
  const input = event.target as HTMLInputElement
  const max = target === 'middle' ? 3 : 2
  const value = englishDigits(input.value).replace(/\D/g, '').slice(0, max)
  if (target === 'first') {
    first.value = value
    if (value.length === max) letterInput.value?.focus()
  } else if (target === 'middle') {
    middle.value = value
    if (value.length === max) regionInput.value?.focus()
  } else {
    region.value = value
  }
  input.value = value
}

function typeLetter(event: Event) {
  const input = event.target as HTMLInputElement
  const value = input.value.trim().replace(/ي/g, 'ی').replace(/ك/g, 'ک')
  const matched = letters.find(item => item === value)
  letter.value = matched || value.slice(0, 3)
  input.value = letter.value
  if (matched) middleInput.value?.focus()
}

function handlePaste(event: ClipboardEvent) {
  const value = event.clipboardData?.getData('text') || ''
  const match = parsePlate(value)
  if (!match) return
  event.preventDefault()
  first.value = match[1]
  letter.value = match[2]
  middle.value = match[3]
  region.value = match[4]
}
</script>

<template>
  <div @paste="handlePaste">
    <div class="overflow-hidden rounded-2xl border-2 border-black/10 bg-white transition focus-within:border-brand-500 focus-within:ring-3 focus-within:ring-brand-100" dir="ltr">
      <div class="grid grid-cols-[1fr_.9fr_1.35fr_.8fr_1fr] items-stretch divide-x divide-black/10">
        <input
          :value="first"
          inputmode="numeric"
          maxlength="2"
          aria-label="دو رقم سمت چپ پلاک"
          class="min-w-0 border-0 bg-transparent px-2 py-3 text-center text-lg font-700 outline-none"
          placeholder="۱۲"
          @input="digitsFromEvent($event, 'first')"
        >
        <input
          ref="letterInput"
          :value="letter"
          list="iranian-plate-letters"
          maxlength="3"
          aria-label="حرف پلاک"
          class="min-w-0 border-0 bg-transparent px-1 py-3 text-center text-lg font-700 outline-none"
          placeholder="حرف"
          @input="typeLetter"
        >
        <datalist id="iranian-plate-letters">
          <option v-for="item in letters" :key="item" :value="item" />
        </datalist>
        <input
          ref="middleInput"
          :value="middle"
          inputmode="numeric"
          maxlength="3"
          aria-label="سه رقم میانی پلاک"
          class="min-w-0 border-0 bg-transparent px-2 py-3 text-center text-lg font-700 outline-none"
          placeholder="۳۴۵"
          @input="digitsFromEvent($event, 'middle')"
        >
        <span class="grid place-items-center bg-black/[.025] px-1 text-center text-[10px] font-800 leading-4 text-muted">ایران</span>
        <input
          ref="regionInput"
          :value="region"
          inputmode="numeric"
          maxlength="2"
          aria-label="کد شهر پلاک"
          class="min-w-0 border-0 bg-transparent px-2 py-3 text-center text-lg font-700 outline-none"
          placeholder="۶۷"
          @input="digitsFromEvent($event, 'region')"
        >
      </div>
    </div>
    <p class="mb-0 mt-2 text-xs" :class="partial ? 'text-amber-700' : 'text-muted'">
      {{ partial ? 'پلاک را کامل وارد کنید یا همه بخش‌ها را خالی بگذارید.' : 'اختیاری است؛ می‌توانید پلاک کامل را نیز اینجا Paste کنید.' }}
    </p>
  </div>
</template>
