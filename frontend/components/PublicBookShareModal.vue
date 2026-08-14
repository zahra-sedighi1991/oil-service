<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
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
const generatingImage = ref(false)
const sharing = ref(false)
const openingMessenger = ref<'telegram' | 'eitaa' | 'rubika' | null>(null)
const usernameMessenger = ref<'eitaa' | 'rubika' | null>(null)
const messengerUsernameInput = ref('')
let generationId = 0
let messengerFallbackTimer: ReturnType<typeof setTimeout> | undefined
let removeMessengerVisibilityListener: (() => void) | undefined
const isNativeApp = computed(() => import.meta.client && Capacitor.isNativePlatform())
const supportsNativeShare = computed(() => isNativeApp.value || (import.meta.client && typeof navigator.share === 'function'))
const imageFileName = computed(() => `service-${props.card?.invoiceNo || 'card'}.png`.replace(/[^a-zA-Z0-9._-]/g, '-'))
const customerPhone = computed(() => normalizeInternationalPhone(props.customerMobile))
const messengerUsername = computed(() => messengerUsernameInput.value.trim().replace(/^@+/, ''))
const usernameMinimumLength = computed(() => usernameMessenger.value === 'eitaa' ? 6 : 4)
const isMessengerUsernameValid = computed(() => new RegExp(`^[a-zA-Z0-9_]{${usernameMinimumLength.value},64}$`).test(messengerUsername.value))
const usernameMessengerLabel = computed(() => usernameMessenger.value === 'rubika' ? 'روبیکا' : 'ایتا')
const supportsImageShare = computed(() => {
  if (!supportsNativeShare.value || !imageBlob.value) return false
  if (isNativeApp.value) return true
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
    usernameMessenger.value = null
    messengerUsernameInput.value = ''
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
  imageBlob.value = null
  generatingImage.value = false
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
      backgroundColor: '#F4F4F2',
      font: { preferredFormat: 'woff2' }
    })
    if (currentGeneration !== generationId) return
    imageBlob.value = blob
  } catch {
    if (currentGeneration !== generationId) return
    toast.error('ساخت تصویر کارت انجام نشد؛ دوباره تلاش کنید.')
  } finally {
    if (currentGeneration === generationId) generatingImage.value = false
  }
}

function createImageFile() {
  return new File([imageBlob.value!], imageFileName.value, { type: 'image/png' })
}

function blobAsBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error || new Error('Reading image failed'))
    reader.onload = () => resolve(String(reader.result).split(',', 2)[1] || '')
    reader.readAsDataURL(blob)
  })
}

async function shareImageNatively() {
  const [{ Directory, Filesystem }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share')
  ])
  const path = `share/${imageFileName.value}`
  const savedImage = await Filesystem.writeFile({
    path,
    data: await blobAsBase64(imageBlob.value!),
    directory: Directory.Cache,
    recursive: true
  })

  try {
    await Share.share({
      title: props.message,
      text: `${props.message}\n${props.url}`,
      files: [savedImage.uri],
      dialogTitle: 'اشتراک‌گذاری سرویس'
    })
  } finally {
    await Filesystem.deleteFile({ path, directory: Directory.Cache }).catch(() => undefined)
  }
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

function selectUsernameMessenger(messenger: 'eitaa' | 'rubika') {
  if (openingMessenger.value) return
  if (usernameMessenger.value === messenger) {
    usernameMessenger.value = null
    messengerUsernameInput.value = ''
    return
  }
  usernameMessenger.value = messenger
  messengerUsernameInput.value = ''
}

async function openUsernameMessenger() {
  const messenger = usernameMessenger.value
  if (!messenger || !isMessengerUsernameValid.value || openingMessenger.value) return
  openingMessenger.value = messenger
  const username = encodeURIComponent(messengerUsername.value)

  try {
    await writeClipboardText(`${props.message}\n${props.url}`)
    toast.success(`متن و لینک کپی شد؛ آن را در گفت‌وگوی ${usernameMessengerLabel.value} جای‌گذاری کنید.`)
  } catch {
    toast.error(`کپی متن انجام نشد؛ پس از باز شدن ${usernameMessengerLabel.value} از دکمه «کپی لینک» استفاده کنید.`)
  }

  if (messenger === 'eitaa') {
    openMessengerWithFallback(
      `eitaa://resolve?domain=${username}`,
      `https://eitaa.com/${username}`
    )
  } else {
    window.location.href = `https://rubika.ir/${username}`
  }

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
  sharing.value = true
  try {
    if (isNativeApp.value && imageBlob.value) {
      await shareImageNatively()
    } else if (supportsImageShare.value) {
      await navigator.share({
        title: props.message,
        text: `${props.message}\n${props.url}`,
        files: [createImageFile()]
      })
    } else if (isNativeApp.value) {
      const { Share } = await import('@capacitor/share')
      await Share.share({
        title: props.message,
        text: props.message,
        url: props.url,
        dialogTitle: 'اشتراک‌گذاری سرویس'
      })
    } else if (typeof navigator.share === 'function') {
      await navigator.share({
        title: props.message,
        text: props.message,
        url: props.url
      })
    } else {
      await writeClipboardText(`${props.message}\n${props.url}`)
      toast.success('متن و لینک برای ارسال کپی شد.')
      return
    }
    emit('close')
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    if (error instanceof Error && /cancel/i.test(error.message)) return
    toast.error('اشتراک‌گذاری انجام نشد؛ دوباره تلاش کنید.')
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

</script>

<template>
  <AppModal
    :open="open"
    title="ارسال برای مشتری"
    description="روش ارسال دفترچه سرویس را انتخاب کنید."
    @close="emit('close')"
  >
    <div class="rounded-2xl border border-black/7 bg-canvas/55 p-3">
      <div class="mb-3 flex items-center justify-between gap-3 px-0.5">
        <strong class="text-xs font-800 text-ink/75">ارسال مستقیم</strong>
        <span v-if="customerPhone" class="text-[11px] text-muted" dir="ltr">+{{ customerPhone }}</span>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <button
          type="button"
          class="flex min-h-14 items-center gap-2.5 rounded-xl border border-sky-200/80 bg-white px-3 text-sm font-800 text-sky-700 transition active:scale-[.98] disabled:opacity-50"
          :disabled="!customerPhone || Boolean(openingMessenger)"
          @click="openTelegramCustomer"
        >
          <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-50">
            <span v-if="openingMessenger === 'telegram'" class="i-lucide-loader-circle h-4.5 w-4.5 animate-spin" />
            <span v-else class="i-lucide-send h-4.5 w-4.5" />
          </span>
          تلگرام
        </button>
        <button
          type="button"
          class="flex min-h-14 items-center gap-2.5 rounded-xl border border-orange-200/80 bg-white px-3 text-sm font-800 text-orange-700 transition active:scale-[.98] disabled:opacity-50"
          :disabled="Boolean(openingMessenger)"
          @click="selectUsernameMessenger('eitaa')"
        >
          <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-orange-50">
            <span v-if="openingMessenger === 'eitaa'" class="i-lucide-loader-circle h-4.5 w-4.5 animate-spin" />
            <span v-else class="i-lucide-message-square-share h-4.5 w-4.5" />
          </span>
          ایتا
        </button>
        <button
          type="button"
          class="flex min-h-14 items-center gap-2.5 rounded-xl border border-violet-200/80 bg-white px-3 text-sm font-800 text-violet-700 transition active:scale-[.98] disabled:opacity-50"
          :disabled="Boolean(openingMessenger)"
          @click="selectUsernameMessenger('rubika')"
        >
          <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-50">
            <span v-if="openingMessenger === 'rubika'" class="i-lucide-loader-circle h-4.5 w-4.5 animate-spin" />
            <span v-else class="i-lucide-message-circle-more h-4.5 w-4.5" />
          </span>
          روبیکا
        </button>
        <button
          type="button"
          class="flex min-h-14 items-center gap-2.5 rounded-xl border border-emerald-200/80 bg-white px-3 text-sm font-800 text-emerald-700 transition active:scale-[.98] disabled:opacity-50"
          :disabled="!customerPhone || Boolean(openingMessenger)"
          @click="openSmsComposer"
        >
          <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-50">
            <span class="i-lucide-message-square-text h-4.5 w-4.5" />
          </span>
          پیامک
        </button>
      </div>

      <div v-if="usernameMessenger" class="mt-2 rounded-xl border border-black/8 bg-white p-3 shadow-sm">
        <label for="messenger-username" class="mb-1.5 block text-xs font-800 text-ink">نام کاربری {{ usernameMessengerLabel }} مشتری</label>
        <div class="flex gap-2">
          <input
            id="messenger-username"
            v-model="messengerUsernameInput"
            class="field min-w-0 flex-1 py-2.5"
            dir="ltr"
            maxlength="64"
            placeholder="username یا @username"
            autocomplete="off"
            @keyup.enter="openUsernameMessenger"
          >
          <button
            type="button"
            class="btn-primary shrink-0 px-3"
            :disabled="!isMessengerUsernameValid || Boolean(openingMessenger)"
            @click="openUsernameMessenger"
          >
            <span v-if="openingMessenger === usernameMessenger" class="i-lucide-loader-circle h-4 w-4 animate-spin" />
            <span v-else class="i-lucide-external-link h-4 w-4" />
            باز کردن
          </button>
        </div>
        <p v-if="messengerUsernameInput && !isMessengerUsernameValid" class="mb-0 mt-1.5 text-[11px] text-danger">
          نام کاربری باید حداقل {{ usernameMinimumLength }} کاراکتر و شامل حروف انگلیسی، عدد یا زیرخط باشد.
        </p>
        <p v-else class="mb-0 mt-1.5 text-[11px] leading-5 text-muted">
          متن و لینک کپی می‌شود؛ پس از باز شدن {{ usernameMessengerLabel }} آن را جای‌گذاری کنید.
        </p>
      </div>
      <p v-if="customerMobile && !customerPhone" class="mb-0 mt-2 px-1 text-[11px] leading-5 text-amber-800">
        شماره مشتری معتبر نیست؛ ایتا و روبیکا همچنان با نام کاربری قابل استفاده‌اند.
      </p>
    </div>

    <div class="my-4 flex items-center gap-3 text-[11px] text-muted before:h-px before:flex-1 before:bg-black/7 after:h-px after:flex-1 after:bg-black/7">
      روش‌های دیگر
    </div>

    <div class="grid grid-cols-2 gap-2">
      <button
        type="button"
        class="btn-primary w-full"
        :disabled="sharing"
        @click="shareImage()"
      >
        <span v-if="sharing" class="i-lucide-loader-circle h-5 w-5 animate-spin" />
        <span v-else class="i-lucide-share-2 h-5 w-5" />
        {{ sharing
          ? 'در حال اشتراک…'
          : generatingImage
            ? 'در حال آماده‌سازی تصویر…'
            : 'سایر برنامه‌ها' }}
      </button>
      <button type="button" class="btn-secondary w-full" :disabled="!url" @click="copyLink">
        <span class="i-lucide-copy h-5 w-5" />
        کپی لینک
      </button>
    </div>
  </AppModal>

  <div v-if="open && card" class="pointer-events-none fixed left-[-12000px] top-0" aria-hidden="true">
    <div ref="cardElement">
      <ServiceShareCard :data="card" />
    </div>
  </div>
</template>
