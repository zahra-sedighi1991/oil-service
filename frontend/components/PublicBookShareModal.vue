<script setup lang="ts">
import type { ServiceShareCardData } from '~/types/share'

const props = defineProps<{
  open: boolean
  url: string
  message: string
  card?: ServiceShareCardData
}>()

const emit = defineEmits<{ close: [] }>()
const toast = useToast()
const cardElement = ref<HTMLElement | null>(null)
const imageBlob = shallowRef<Blob | null>(null)
const previewUrl = ref('')
const generatingImage = ref(false)
const sharing = ref(false)
const generationFailed = ref(false)
let generationId = 0
const supportsNativeShare = computed(() => import.meta.client && typeof navigator.share === 'function')
const imageFileName = computed(() => `service-${props.card?.invoiceNo || 'card'}.png`.replace(/[^a-zA-Z0-9._-]/g, '-'))
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
    return
  }
  if (props.card) await generateImage()
})

onBeforeUnmount(clearGeneratedImage)

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

async function shareImage() {
  if (!imageBlob.value || !supportsImageShare.value) return
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
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(props.url)
    } else {
      const input = document.createElement('textarea')
      input.value = props.url
      input.setAttribute('readonly', '')
      input.style.position = 'fixed'
      input.style.opacity = '0'
      document.body.appendChild(input)
      input.select()
      const copied = document.execCommand('copy')
      input.remove()
      if (!copied) throw new Error('Copy command failed')
    }
    toast.success('لینک دفترچه سرویس کپی شد.')
  } catch {
    toast.error('کپی لینک انجام نشد؛ دوباره تلاش کنید.')
  }
}

function downloadImage() {
  if (!imageBlob.value) return
  const link = document.createElement('a')
  link.href = previewUrl.value
  link.download = imageFileName.value
  link.click()
  toast.success('تصویر کارت سرویس دانلود شد.')
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

    <div class="mb-3 grid gap-2 sm:grid-cols-2">
      <button
        v-if="card && supportsImageShare"
        type="button"
        class="btn-primary w-full"
        :disabled="sharing"
        @click="shareImage"
      >
        <span v-if="sharing" class="i-lucide-loader-circle h-5 w-5 animate-spin" />
        <span v-else class="i-lucide-share-2 h-5 w-5" />
        {{ sharing ? 'در حال اشتراک…' : 'اشتراک تصویر' }}
      </button>
      <button type="button" class="btn-secondary w-full" :disabled="!url" @click="copyLink">
        <span class="i-lucide-copy h-5 w-5" />
        کپی لینک
      </button>
      <button v-if="card" type="button" class="btn-secondary w-full sm:col-span-2" :disabled="!imageBlob" @click="downloadImage">
        <span class="i-lucide-download h-5 w-5" />
        دانلود تصویر
      </button>
    </div>
    <p v-if="card && imageBlob && !supportsImageShare" class="mb-3 mt-0 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
      مرورگر یا اتصال فعلی ارسال مستقیم فایل را پشتیبانی نمی‌کند؛ تصویر را دانلود و در پیام‌رسان پیوست کنید. این قابلیت روی HTTPS در دسترس است.
    </p>
  </AppModal>

  <div v-if="open && card" class="pointer-events-none fixed left-[-12000px] top-0" aria-hidden="true">
    <div ref="cardElement">
      <ServiceShareCard :data="card" />
    </div>
  </div>
</template>
