<script setup lang="ts">
import { App } from '@capacitor/app'
import { Capacitor, registerPlugin } from '@capacitor/core'

interface AndroidUpdate {
  enabled: boolean
  versionCode: number
  versionName: string
  minimumSupportedVersionCode: number
  downloadUrl: string
  releaseNotes: string[]
}
interface AppUpdaterPlugin {
  downloadAndInstall(options: { url: string; versionName: string }): Promise<{
    permissionRequired: boolean
    downloadId?: number
  }>
}

const AppUpdater = registerPlugin<AppUpdaterPlugin>('AppUpdater')
const api = useApi()
const toast = useToast()
const open = ref(false)
const downloading = ref(false)
const downloadStarted = ref(false)
const update = ref<AndroidUpdate | null>(null)
const currentVersion = ref('')
const currentBuild = ref(0)
const mandatory = computed(() => Boolean(
  update.value && currentBuild.value < update.value.minimumSupportedVersionCode
))
const dismissedKey = computed(() => update.value ? `roghanyar-update-dismissed-${update.value.versionCode}` : '')

onMounted(async () => {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return
  await checkForUpdate()
})

async function checkForUpdate() {
  try {
    const info = await App.getInfo()
    currentVersion.value = info.version
    currentBuild.value = Number(info.build) || 0
    const available = await api.get<AndroidUpdate>('/app-update/android')
    if (!available.enabled || available.versionCode <= currentBuild.value) return

    update.value = available
    const dismissedAt = Number(localStorage.getItem(`roghanyar-update-dismissed-${available.versionCode}`) || 0)
    if (currentBuild.value < available.minimumSupportedVersionCode || Date.now() - dismissedAt > 24 * 60 * 60 * 1000) {
      open.value = true
    }
  } catch {
    // Update checks must never prevent the app from opening when the server is unavailable.
  }
}

function dismiss() {
  if (mandatory.value || !dismissedKey.value) return
  localStorage.setItem(dismissedKey.value, String(Date.now()))
  open.value = false
}

async function installUpdate() {
  if (!update.value || downloading.value || downloadStarted.value) return
  downloading.value = true
  try {
    const result = await AppUpdater.downloadAndInstall({
      url: update.value.downloadUrl,
      versionName: update.value.versionName
    })
    if (result.permissionRequired) {
      toast.info('اجازه نصب برنامه را فعال کنید، سپس به روغن‌یار برگردید و دوباره روی به‌روزرسانی بزنید.')
      return
    }
    downloadStarted.value = true
    toast.success('دانلود شروع شد؛ پس از پایان، صفحه نصب باز می‌شود.')
  } catch {
    toast.error('دانلود نسخه جدید شروع نشد؛ اتصال اینترنت و آدرس فایل را بررسی کنید.')
  } finally {
    downloading.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="update-prompt">
      <div v-if="open && update" class="fixed inset-0 z-100 flex items-end justify-center bg-ink/55 backdrop-blur-sm sm:items-center sm:p-5" @click.self="dismiss">
        <section class="w-full rounded-t-[1.75rem] bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-[1.75rem] sm:p-6">
          <div class="flex items-start gap-3">
            <span class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-900"><span class="i-lucide-download h-6 w-6" /></span>
            <div class="min-w-0 flex-1">
              <span class="text-[10px] font-800 text-brand-700">نسخه {{ update.versionName }}</span>
              <h2 class="mb-0 mt-0.5 text-lg font-900">به‌روزرسانی روغن‌یار آماده است</h2>
              <p class="mb-0 mt-1 text-xs leading-5 text-muted">نسخه فعلی {{ currentVersion }} است. فایل جدید دانلود می‌شود و سپس اندروید تأیید نصب را نمایش می‌دهد.</p>
            </div>
            <button v-if="!mandatory" type="button" class="btn-ghost h-9 w-9 shrink-0 p-0" aria-label="بعداً" @click="dismiss"><span class="i-lucide-x h-5 w-5" /></button>
          </div>

          <ul v-if="update.releaseNotes.length" class="mb-0 mt-4 grid gap-2 rounded-2xl bg-black/[.035] p-3 text-xs leading-5 text-ink/75">
            <li v-for="note in update.releaseNotes" :key="note" class="flex gap-2"><span class="i-lucide-check mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-700" /><span>{{ note }}</span></li>
          </ul>
          <p v-if="mandatory" class="mb-0 mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">برای ادامه استفاده از برنامه، نصب این نسخه ضروری است.</p>
          <p v-if="downloadStarted" class="mb-0 mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-700">دانلود در نوار اعلان اندروید نمایش داده می‌شود. بعد از پایان، نصب نسخه جدید را تأیید کنید.</p>

          <button type="button" class="btn-primary mt-4 min-h-12 w-full" :disabled="downloading || downloadStarted" @click="installUpdate">
            <span class="h-4.5 w-4.5" :class="downloading ? 'i-lucide-loader-circle animate-spin' : downloadStarted ? 'i-lucide-check' : 'i-lucide-download'" />
            {{ downloading ? 'در حال آماده‌سازی دانلود…' : downloadStarted ? 'دانلود در حال انجام است' : 'دانلود و نصب نسخه جدید' }}
          </button>
          <button v-if="!mandatory" type="button" class="btn-ghost mt-1 w-full text-xs" @click="dismiss">بعداً یادآوری کن</button>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.update-prompt-enter-active, .update-prompt-leave-active { transition: opacity .18s ease; }
.update-prompt-enter-active section, .update-prompt-leave-active section { transition: transform .18s ease; }
.update-prompt-enter-from, .update-prompt-leave-to { opacity: 0; }
.update-prompt-enter-from section, .update-prompt-leave-to section { transform: translateY(16px); }
</style>
