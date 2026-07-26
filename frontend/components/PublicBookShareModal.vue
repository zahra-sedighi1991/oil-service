<script setup lang="ts">
const props = defineProps<{
  open: boolean
  url: string
  message: string
}>()

const emit = defineEmits<{ close: [] }>()
const toast = useToast()
const supportsNativeShare = computed(() => import.meta.client && typeof navigator.share === 'function')

function channelUrl(channel: 'eitaa' | 'telegram') {
  const base = channel === 'telegram'
    ? 'https://t.me/share/url'
    : 'https://eitaa.com/share/url'
  return `${base}?url=${encodeURIComponent(props.url)}&text=${encodeURIComponent(props.message)}`
}

async function nativeShare() {
  try {
    await navigator.share({
      title: 'دفترچه سرویس خودرو',
      text: props.message,
      url: props.url
    })
    emit('close')
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    toast.error('اشتراک‌گذاری مستقیم در دسترس نیست؛ ایتا یا تلگرام را انتخاب کنید.')
  }
}
</script>

<template>
  <AppModal
    :open="open"
    title="ارسال دفترچه سرویس"
    description="پیام‌رسان یا برنامه موردنظر را برای ارسال لینک به مشتری انتخاب کنید."
    @close="emit('close')"
  >
    <button v-if="supportsNativeShare" class="btn-primary mb-3 w-full" @click="nativeShare">
      <span class="i-lucide-share-2 h-5 w-5" />
      ارسال با برنامه‌های گوشی
    </button>
    <div class="grid gap-3 sm:grid-cols-2">
      <a
        :href="channelUrl('eitaa')"
        class="flex items-center gap-3 rounded-2xl border border-black/7 bg-white p-4 text-right text-ink no-underline transition hover:border-amber-400 hover:bg-amber-50"
        @click="emit('close')"
      >
        <span class="grid h-11 w-11 place-items-center rounded-xl bg-amber-500 text-white">
          <span class="i-lucide-message-circle h-6 w-6" />
        </span>
        <span><strong class="block">ارسال در ایتا</strong><small class="mt-1 block text-ink/45">انتخاب مخاطب در ایتا</small></span>
      </a>
      <a
        :href="channelUrl('telegram')"
        class="flex items-center gap-3 rounded-2xl border border-black/7 bg-white p-4 text-right text-ink no-underline transition hover:border-sky-400 hover:bg-sky-50"
        @click="emit('close')"
      >
        <span class="grid h-11 w-11 place-items-center rounded-xl bg-sky-500 text-white">
          <span class="i-lucide-send h-6 w-6" />
        </span>
        <span><strong class="block">ارسال در تلگرام</strong><small class="mt-1 block text-ink/45">انتخاب مخاطب در تلگرام</small></span>
      </a>
    </div>
  </AppModal>
</template>
