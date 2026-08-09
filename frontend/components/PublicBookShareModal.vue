<script setup lang="ts">
import type { ServiceShareCardData } from '~/types/share'

const props = defineProps<{
  open: boolean
  url: string
  message: string
  card?: ServiceShareCardData
  customerMobile?: string
}>()

const emit = defineEmits<{ close: [] }>()
const toast = useToast()
const cardElement = ref<HTMLElement | null>(null)
const imageBlob = shallowRef<Blob | null>(null)
const previewUrl = ref('')
const generatingImage = ref(false)
const sharing = ref(false)
const openingMessenger = ref<'telegram' | 'eitaa' | null>(null)
const showEitaaUsername = ref(false)
const eitaaUsernameInput = ref('')
const generationFailed = ref(false)
let generationId = 0
let messengerFallbackTimer: ReturnType<typeof setTimeout> | undefined
let removeMessengerVisibilityListener: (() => void) | undefined
const supportsNativeShare = computed(() => import.meta.client && typeof navigator.share === 'function')
const imageFileName = computed(() => `service-${props.card?.invoiceNo || 'card'}.png`.replace(/[^a-zA-Z0-9._-]/g, '-'))
const customerPhone = computed(() => normalizeInternationalPhone(props.customerMobile))
const eitaaUsername = computed(() => eitaaUsernameInput.value.trim().replace(/^@+/, ''))
const isEitaaUsernameValid = computed(() => /^[a-zA-Z0-9_]{6,}$/.test(eitaaUsername.value))
const supportsImageShare = computed(() => {
  if (!supportsNativeShare.value || !imageBlob.value) return false
  if (typeof navigator.canShare !== 'function') return true
  try {
    return navigator.canShare({ files: [createImageFile()] })
  } catch {
    return false
  }
})

watch(() => props.open, async (open) => {
  if (!open) {
    clearGeneratedImage()
    showEitaaUsername.value = false
    eitaaUsernameInput.value = ''
    return
  }
  if (props.card) await generateImage()
})

onBeforeUnmount(() => {
  clearGeneratedImage()
  clearMessengerFallback()
})

function clearGeneratedImage() {
  generationId += 1
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
  imageBlob.value = null
  generatingImage.value = false
  generationFailed.value = false
}

async function generateImage() {
  clearGeneratedImage()
  const currentGeneration = ++generationId
  generatingImage.value = true
  try {
    await nextTick()
    await document.fonts?.ready
    if (!cardElement.value) throw new Error('Share card is not mounted')
    const { domToBlob } = await import('modern-screenshot')
    const blob = await domToBlob(cardElement.value, {
      width: 1050,
      height: 600,
      scale: 1,
      type: 'image/png',
      backgroundColor: '#102019',
      font: { preferredFormat: 'woff2' }
    })
    if (currentGeneration !== generationId) return
    imageBlob.value = blob
    previewUrl.value = URL.createObjectURL(blob)
  } catch {
    if (currentGeneration !== generationId) return
    generationFailed.value = true
    toast.error('ساخت تصویر کارت انجام نشد؛ دوباره تلاش کنید.')
  } finally {
    if (currentGeneration === generationId) generatingImage.value = false
  }
}

function createImageFile() {
  return new File([imageBlob.value!], imageFileName.value, { type: 'image/png' })
}

function normalizeInternationalPhone(value?: string) {
  if (!value) return ''
  const latinDigits = value
    .replace(/[\u06F0-\u06F9]/g, digit => String(digit.charCodeAt(0) - 0x06F0))
    .replace(/[\u0660-\u0669]/g, digit => String(digit.charCodeAt(0) - 0x0660))
  let digits = latinDigits.replace(/\D/g, '')
  if (digits.startsWith('0098')) digits = digits.slice(2)
  if (digits.startsWith('0')) digits = `98${digits.slice(1)}`
  else if (digits.length === 10 && digits.startsWith('9')) digits = `98${digits}`
  return /^989\d{9}$/.test(digits) ? digits : ''
}

function clearMessengerFallback() {
  if (messengerFallbackTimer) clearTimeout(messengerFallbackTimer)
  messengerFallbackTimer = undefined
  removeMessengerVisibilityListener?.()
  removeMessengerVisibilityListener = undefined
}

function openMessengerWithFallback(appUrl: string, fallbackUrl: string) {
  clearMessengerFallback()
  let appOpened = false
  const onVisibilityChange = () => {
    if (document.hidden) appOpened = true
  }
  document.addEventListener('visibilitychange', onVisibilityChange)
  removeMessengerVisibilityListener = () => document.removeEventListener('visibilitychange', onVisibilityChange)

  window.location.href = appUrl
  messengerFallbackTimer = setTimeout(() => {
    clearMessengerFallback()
    if (!appOpened && !document.hidden) window.location.href = fallbackUrl
  }, 1800)
}

function openTelegramCustomer() {
  if (!customerPhone.value || openingMessenger.value) return
  openingMessenger.value = 'telegram'
  const text = encodeURIComponent(`${props.message}\n${props.url}`)

  openMessengerWithFallback(
    `tg://resolve?phone=${customerPhone.value}&text=${text}`,
    `https://t.me/+${customerPhone.value}?text=${text}`
  )

  window.setTimeout(() => {
    openingMessenger.value = null
  }, 2500)
}

async function writeClipboardText(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // Some browsers expose the Clipboard API but deny access to it.
      // Fall through to the synchronous copy method in that case.
    }
  }

  const input = document.createElement('textarea')
  input.value = text
  input.setAttribute('readonly', '')
  input.style.position = 'fixed'
  input.style.opacity = '0'
  document.body.appendChild(input)
  input.select()
  const copied = document.execCommand('copy')
  input.remove()
  if (!copied) throw new Error('Copy command failed')
}

async function openEitaaCustomer() {
  if (!isEitaaUsernameValid.value || openingMessenger.value) return
  openingMessenger.value = 'eitaa'
  const username = encodeURIComponent(eitaaUsername.value)

  try {
    await writeClipboardText(`${props.message}\n${props.url}`)
    toast.success('متن و لینک کپی شد؛ آن را در گفت‌وگوی ایتا جای‌گذاری کنید.')
  } catch {
    toast.error('کپی متن انجام نشد؛ پس از باز شدن ایتا از دکمه «کپی لینک» استفاده کنید.')
  }

  openMessengerWithFallback(
    `eitaa://resolve?domain=${username}`,
    `https://eitaa.com/${username}`
  )

  window.setTimeout(() => {
    openingMessenger.value = null
  }, 2500)
}

function openSmsComposer() {
  if (!customerPhone.value || openingMessenger.value) return
  clearMessengerFallback()
  const text = encodeURIComponent(`${props.message}\n${props.url}`)
  window.location.href = `sms:+${customerPhone.value}?body=${text}`
}

async function shareImage() {
  if (!imageBlob.value) return

  if (!supportsImageShare.value) {
    downloadImage(false)
    try {
      await writeClipboardText(`${props.message}\n${props.url}`)
      toast.success('تصویر دانلود و متن و لینک کپی شد؛ آن‌ها را در پیام‌رسان ارسال کنید.')
    } catch {
      toast.success('تصویر دانلود شد؛ آن را در پیام‌رسان پیوست کنید.')
    }

    return
  }

  sharing.value = true
  try {
    await navigator.share({
      title: props.message,
      text: `${props.message}\n${props.url}`,
      files: [createImageFile()]
    })
    emit('close')
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    toast.error('ارسال مستقیم تصویر انجام نشد؛ تصویر را دانلود و در پیام‌رسان پیوست کنید.')
  } finally {
    sharing.value = false
  }
}

async function copyLink() {
  if (!props.url) return
  try {
    await writeClipboardText(props.url)
    toast.success('لینک دفترچه سرویس کپی شد.')
  } catch {
    toast.error('کپی لینک انجام نشد؛ دوباره تلاش کنید.')
  }
}

function downloadImage(showToast = true) {
  if (!imageBlob.value) return
  const link = document.createElement('a')
  link.href = previewUrl.value
  link.download = imageFileName.value
  link.click()
  if (showToast) toast.success('تصویر کارت سرویس دانلود شد.')
}
</script>

<template>
  <AppModal
    :open="open"
    title="اشتراک‌گذاری سرویس"
    :description="card ? 'تصویر کارت سرویس را همراه لینک دفترچه برای مشتری ارسال کنید.' : 'پیام‌رسان یا برنامه موردنظر را برای ارسال لینک به مشتری انتخاب کنید.'"
    @close="emit('close')"
  >
    <div v-if="card" class="mb-4 overflow-hidden rounded-2xl border border-black/8 bg-black/[.025]">
      <div class="aspect-[7/4] bg-ink/5">
        <img v-if="previewUrl" :src="previewUrl" class="h-full w-full object-cover" alt="پیش‌نمایش کارت سرویس">
        <div v-else class="grid h-full place-items-center p-8 text-center text-sm text-ink/45">
          <div v-if="generatingImage">
            <span class="i-lucide-loader-circle mx-auto mb-3 block h-8 w-8 animate-spin text-brand-600" />
            در حال ساخت تصویر کارت…
          </div>
          <div v-else-if="generationFailed">
            <span class="i-lucide-image-off mx-auto mb-3 block h-8 w-8 text-danger" />
            <p class="m-0">ساخت تصویر ناموفق بود.</p>
            <button class="btn-ghost mt-2 text-brand-700" @click="generateImage">تلاش دوباره</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="customerPhone" class="mb-4 rounded-2xl border border-brand-200 bg-brand-50/70 p-3">
      <div class="mb-2 flex items-center justify-between gap-3">
        <div>
          <strong class="block text-sm text-brand-900">ارسال به همین مشتری</strong>
          <span class="mt-0.5 block text-xs text-brand-800/65" dir="ltr">+{{ customerPhone }}</span>
        </div>
        <span class="i-lucide-message-circle h-5 w-5 shrink-0 text-brand-700" />
      </div>
      <div class="grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          class="btn-secondary w-full border-sky-200 bg-white text-sky-700"
          :disabled="Boolean(openingMessenger)"
          @click="openTelegramCustomer"
        >
          <span v-if="openingMessenger === 'telegram'" class="i-lucide-loader-circle h-5 w-5 animate-spin" />
          <span v-else class="i-lucide-send h-5 w-5" />
          ارسال با تلگرام
        </button>
        <button
          type="button"
          class="btn-secondary w-full border-orange-200 bg-white text-orange-700"
          :disabled="Boolean(openingMessenger)"
          @click="showEitaaUsername = !showEitaaUsername"
        >
          <span v-if="openingMessenger === 'eitaa'" class="i-lucide-loader-circle h-5 w-5 animate-spin" />
          <span v-else class="i-lucide-message-square-share h-5 w-5" />
          ارسال با ایتا
        </button>
        <button
          type="button"
          class="btn-secondary w-full border-emerald-200 bg-white text-emerald-700"
          :disabled="Boolean(openingMessenger)"
          @click="openSmsComposer"
        >
          <span class="i-lucide-message-square-text h-5 w-5" />
          پیامک
        </button>
      </div>

      <div v-if="showEitaaUsername" class="mt-3 rounded-xl border border-orange-200 bg-white p-3">
        <label for="eitaa-username" class="mb-1.5 block text-xs font-700 text-orange-900">نام کاربری ایتای مشتری</label>
        <div class="flex flex-col gap-2 sm:flex-row">
          <input
            id="eitaa-username"
            v-model="eitaaUsernameInput"
            class="input flex-1"
            dir="ltr"
            maxlength="64"
            placeholder="username یا @username"
            autocomplete="off"
            @keyup.enter="openEitaaCustomer"
          >
          <button
            type="button"
            class="btn-secondary border-orange-200 text-orange-700"
            :disabled="!isEitaaUsernameValid || Boolean(openingMessenger)"
            @click="openEitaaCustomer"
          >
            <span v-if="openingMessenger === 'eitaa'" class="i-lucide-loader-circle h-5 w-5 animate-spin" />
            <span v-else class="i-lucide-external-link h-5 w-5" />
            کپی و باز کردن گفت‌وگو
          </button>
        </div>
        <p v-if="eitaaUsernameInput && !isEitaaUsernameValid" class="mb-0 mt-1.5 text-xs text-danger">
          نام کاربری باید حداقل ۶ کاراکتر و شامل حروف انگلیسی، عدد یا زیرخط باشد.
        </p>
        <p v-else-if="eitaaUsernameInput" class="mb-0 mt-1.5 text-xs leading-5 text-orange-800/75">
          متن و لینک کپی می‌شود؛ پس از باز شدن گفت‌وگو آن را جای‌گذاری کنید.
        </p>
        <button type="button" class="btn-ghost mt-2 text-xs text-ink/55" @click="openSmsComposer">
          مشتری نام کاربری ایتا ندارد؟ ارسال با پیامک
        </button>
      </div>

      <p class="mb-0 mt-2 text-xs leading-5 text-brand-900/65">
        تلگرام با متن و لینک آماده باز می‌شود. برای ایتا نام کاربری را وارد کنید؛ متن و لینک کپی می‌شود تا آن را در گفت‌وگو جای‌گذاری کنید.
      </p>
    </div>
    <p v-else-if="customerMobile" class="mb-4 mt-0 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
      شماره موبایل مشتری معتبر نیست؛ ارسال مستقیم به گفت‌وگوی او در دسترس نیست.
    </p>

    <div class="mb-3 grid gap-2 sm:grid-cols-2">
      <button
        v-if="card"
        type="button"
        class="btn-primary w-full"
        :disabled="sharing || generatingImage || !imageBlob"
        @click="shareImage()"
      >
        <span v-if="sharing" class="i-lucide-loader-circle h-5 w-5 animate-spin" />
        <span v-else-if="supportsImageShare" class="i-lucide-share-2 h-5 w-5" />
        <span v-else class="i-lucide-download h-5 w-5" />
        {{ sharing
          ? 'در حال اشتراک…'
          : generatingImage
            ? 'در حال آماده‌سازی تصویر…'
            : supportsImageShare
              ? 'سایر پیام‌رسان‌ها'
              : 'دانلود تصویر برای ارسال' }}
      </button>
      <button type="button" class="btn-secondary w-full" :disabled="!url" @click="copyLink">
        <span class="i-lucide-copy h-5 w-5" />
        کپی لینک
      </button>
      <button v-if="card" type="button" class="btn-secondary w-full sm:col-span-2" :disabled="!imageBlob" @click="downloadImage()">
        <span class="i-lucide-download h-5 w-5" />
        دانلود تصویر
      </button>
    </div>
    <p v-if="card && imageBlob" class="mb-3 mt-0 rounded-xl px-3 py-2 text-xs leading-5" :class="supportsImageShare ? 'bg-brand-50 text-brand-800' : 'bg-amber-50 text-amber-800'">
      <template v-if="supportsImageShare">
        از فهرست اشتراک‌گذاری گوشی، ایتا، تلگرام یا شبکه اجتماعی موردنظر را انتخاب کنید؛ تصویر همراه متن و لینک ارسال می‌شود.
      </template>
      <template v-else>
        مرورگر فعلی ارسال مستقیم فایل را پشتیبانی نمی‌کند؛ تصویر دانلود و متن و لینک کپی می‌شود تا آن‌ها را در پیام‌رسان پیوست کنید. ارسال مستقیم روی HTTPS و مرورگرهای سازگار در دسترس است.
      </template>
    </p>
  </AppModal>

  <div v-if="open && card" class="pointer-events-none fixed left-[-12000px] top-0" aria-hidden="true">
    <div ref="cardElement">
      <ServiceShareCard :data="card" />
    </div>
  </div>
</template>
