<script setup lang="ts">
import { App } from '@capacitor/app'
import { Capacitor, registerPlugin } from '@capacitor/core'

interface WebUpdate {
  enabled: boolean
  buildNumber?: number
  version?: string
  sha256?: string
  minimumNativeVersionCode?: number
  downloadUrl?: string
  releaseNotes?: string[]
}
interface NativeUpdate {
  enabled: boolean
  versionCode?: number
  versionName?: string
  mandatory?: boolean
  releaseNotes?: string[]
  stores?: { bazaar?: string; myket?: string; googlePlay?: string }
}
interface UpdateResponse { web: WebUpdate; native: NativeUpdate }
interface AppUpdaterPlugin {
  getActiveWebVersion(): Promise<{ version: string; buildNumber: number }>
  confirmWebBundle(): Promise<void>
  installWebBundle(options: { url: string; version: string; buildNumber: number; sha256: string }): Promise<void>
  openStore(options: { url: string }): Promise<void>
}

const AppUpdater = registerPlugin<AppUpdaterPlugin>('AppUpdater')
const api = useApi()
const config = useRuntimeConfig()
const toast = useToast()
const open = ref(false)
const updating = ref(false)
const updateType = ref<'web' | 'native'>('web')
const available = ref<UpdateResponse | null>(null)
const currentNativeBuild = ref(0)
let lastCheckedAt = 0
let appStateListener: { remove: () => Promise<void> } | undefined

const currentUpdate = computed(() => updateType.value === 'native' ? available.value?.native : available.value?.web)
const releaseNotes = computed(() => currentUpdate.value?.releaseNotes || [])
const nativeMandatory = computed(() => updateType.value === 'native' && available.value?.native.mandatory === true)
const webBlockedByNative = computed(() => {
  const minimum = available.value?.web.minimumNativeVersionCode || 0
  return minimum > currentNativeBuild.value
})
const title = computed(() => updateType.value === 'web' ? 'نسخه جدید برنامه آماده است' : 'نسخه جدید اندروید آماده است')
const versionLabel = computed(() => updateType.value === 'web'
  ? available.value?.web.version
  : available.value?.native.versionName)
const storeOptions = computed(() => {
  const stores = available.value?.native.stores || {}
  return [
    { key: 'bazaar', label: 'دریافت از بازار', icon: 'i-lucide-shopping-bag', url: stores.bazaar },
    { key: 'myket', label: 'دریافت از مایکت', icon: 'i-lucide-store', url: stores.myket },
    { key: 'googlePlay', label: 'دریافت از Google Play', icon: 'i-lucide-play', url: stores.googlePlay }
  ].filter(item => Boolean(item.url))
})
const dismissalKey = computed(() => updateType.value === 'web'
  ? `roghanyar-web-update-dismissed-${available.value?.web.buildNumber || ''}`
  : `roghanyar-native-update-dismissed-${available.value?.native.versionCode || ''}`)

onMounted(async () => {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return
  await AppUpdater.confirmWebBundle()
  await checkForUpdate()
  appStateListener = await App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) void checkForUpdate()
  })
})
onBeforeUnmount(() => { void appStateListener?.remove() })

async function checkForUpdate() {
  if (Date.now() - lastCheckedAt < 15 * 60 * 1000) return
  lastCheckedAt = Date.now()
  try {
    const [appInfo, webInfo, response] = await Promise.all([
      App.getInfo(),
      AppUpdater.getActiveWebVersion(),
      api.get<UpdateResponse>('/app-update/android')
    ])
    currentNativeBuild.value = Number(appInfo.build) || 0
    available.value = response
    const nativeIsNew = response.native.enabled && Number(response.native.versionCode || 0) > currentNativeBuild.value
    if (nativeIsNew) {
      const dismissedAt = Number(localStorage.getItem(`roghanyar-native-update-dismissed-${response.native.versionCode}`) || 0)
      if (response.native.mandatory || Date.now() - dismissedAt > 24 * 60 * 60 * 1000) {
        updateType.value = 'native'
        open.value = true
        return
      }
    }
    const installedWebBuild = Math.max(Number(webInfo.buildNumber || 0), Number(config.public.webBuildNumber || 0))
    const webIsNew = response.web.enabled && Number(response.web.buildNumber || 0) > installedWebBuild
    if (webIsNew) {
      if (webBlockedByNative.value) return
      updateType.value = 'web'
      const dismissedAt = Number(localStorage.getItem(`roghanyar-web-update-dismissed-${response.web.buildNumber}`) || 0)
      if (Date.now() - dismissedAt > 24 * 60 * 60 * 1000) open.value = true
    }
  } catch {
    // Update checks must not prevent the app from opening when offline.
  }
}

function dismiss() {
  if (nativeMandatory.value) return
  localStorage.setItem(dismissalKey.value, String(Date.now()))
  open.value = false
}

async function applyWebUpdate() {
  const web = available.value?.web
  if (!web?.downloadUrl || !web.version || !web.buildNumber || !web.sha256 || updating.value) return
  updating.value = true
  try {
    await AppUpdater.installWebBundle({ url: web.downloadUrl, version: web.version, buildNumber: web.buildNumber, sha256: web.sha256 })
    toast.success('نسخه جدید دریافت شد؛ برنامه در حال راه‌اندازی مجدد است.')
  } catch {
    toast.error('دریافت به‌روزرسانی کامل نشد؛ دوباره تلاش کنید.')
    updating.value = false
  }
}

async function openStore(url?: string) {
  if (!url) return
  try {
    await AppUpdater.openStore({ url })
  } catch {
    toast.error('بازکردن فروشگاه برنامه ممکن نشد.')
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="update-prompt">
      <div v-if="open && available" class="fixed inset-0 z-100 flex items-end justify-center bg-ink/55 backdrop-blur-sm sm:items-center sm:p-5" @click.self="dismiss">
        <section class="w-full rounded-t-[1.75rem] bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-[1.75rem] sm:p-6">
          <div class="flex items-start gap-3">
            <span class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-900"><span class="h-6 w-6" :class="updateType === 'web' ? 'i-lucide-refresh-cw' : 'i-lucide-smartphone'" /></span>
            <div class="min-w-0 flex-1"><span class="text-[10px] font-800 text-brand-700">نسخه {{ versionLabel }}</span><h2 class="mb-0 mt-0.5 text-lg font-900">{{ title }}</h2><p class="mb-0 mt-1 text-xs leading-5 text-muted">{{ updateType === 'web' ? 'این به‌روزرسانی سبک است و بدون نصب دوباره APK اعمال می‌شود.' : 'این نسخه شامل تغییرات اندروید است و باید از فروشگاه برنامه نصب شود.' }}</p></div>
            <button v-if="!nativeMandatory" type="button" class="btn-ghost h-9 w-9 shrink-0 p-0" aria-label="بعداً" @click="dismiss"><span class="i-lucide-x h-5 w-5" /></button>
          </div>

          <ul v-if="releaseNotes.length" class="mb-0 mt-4 grid gap-2 rounded-2xl bg-black/[.035] p-3 text-xs leading-5 text-ink/75"><li v-for="note in releaseNotes" :key="note" class="flex gap-2"><span class="i-lucide-check mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-700" /><span>{{ note }}</span></li></ul>
          <p v-if="nativeMandatory" class="mb-0 mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">برای ادامه استفاده از برنامه، نصب نسخه جدید اندروید ضروری است.</p>

          <button v-if="updateType === 'web'" type="button" class="btn-primary mt-4 min-h-12 w-full" :disabled="updating" @click="applyWebUpdate"><span class="h-4.5 w-4.5" :class="updating ? 'i-lucide-loader-circle animate-spin' : 'i-lucide-refresh-cw'" />{{ updating ? 'در حال دریافت و اعمال…' : 'به‌روزرسانی برنامه' }}</button>
          <div v-else class="mt-4 grid gap-2"><button v-for="store in storeOptions" :key="store.key" type="button" class="btn-primary min-h-12 w-full" @click="openStore(store.url)"><span class="h-4.5 w-4.5" :class="store.icon" />{{ store.label }}</button><p v-if="!storeOptions.length" class="m-0 rounded-xl bg-red-50 px-3 py-2 text-xs text-danger">لینک فروشگاه برای این نسخه تنظیم نشده است.</p></div>
          <button v-if="!nativeMandatory" type="button" class="btn-ghost mt-1 w-full text-xs" @click="dismiss">بعداً یادآوری کن</button>
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
