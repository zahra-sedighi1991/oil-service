<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import { DEBUG_SERVER_STORAGE_KEY } from '~/utils/api-base'

const config = useRuntimeConfig()
const { token, user } = useAuth()
const open = ref(false)
const ip = ref('')
const connecting = ref(false)
const error = ref('')
const connectedOrigin = ref('')

const enabled = computed(() => Boolean(config.public.debugServerPicker) && Capacitor.isNativePlatform())

onMounted(() => {
  if (!enabled.value) return
  const savedOrigin = localStorage.getItem(DEBUG_SERVER_STORAGE_KEY) ?? ''
  connectedOrigin.value = savedOrigin
  ip.value = savedOrigin.replace(/^https?:\/\//, '').replace(/:\d+$/, '')
  open.value = true
})

function normalizeIp(value: string) {
  return value.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/:\d+$/, '')
}

function validIpv4(value: string) {
  const parts = value.split('.')
  return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255)
}

async function connect() {
  const host = normalizeIp(ip.value)
  ip.value = host
  error.value = ''
  if (!validIpv4(host)) {
    error.value = 'IP را مانند 192.168.1.10 وارد کنید.'
    return
  }

  connecting.value = true
  const origin = `http://${host}:3000`
  try {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 6000)
    try {
      const response = await fetch(`${origin}/health`, { signal: controller.signal, cache: 'no-store' })
      if (!response.ok) throw new Error('unhealthy')
    } finally {
      window.clearTimeout(timer)
    }

    if (connectedOrigin.value && connectedOrigin.value !== origin) {
      token.value = null
      user.value = null
      localStorage.removeItem('oil-service-user')
    }
    localStorage.setItem(DEBUG_SERVER_STORAGE_KEY, origin)
    connectedOrigin.value = origin
    open.value = false
    await navigateTo(token.value ? '/dashboard' : '/login')
  } catch {
    error.value = 'اتصال برقرار نشد. گوشی و سیستم باید روی یک Wi-Fi باشند و API روی پورت 3000 اجرا شود.'
  } finally {
    connecting.value = false
  }
}
</script>

<template>
  <template v-if="enabled">
    <button
      v-if="!open"
      type="button"
      class="fixed left-3 z-90 flex items-center gap-1.5 rounded-full border border-black/10 bg-ink px-3 py-2 text-[10px] font-800 text-white shadow-xl"
      style="bottom: max(0.75rem, env(safe-area-inset-bottom));"
      @click="open = true"
    >
      <span class="i-lucide-wifi h-3.5 w-3.5 text-brand-400" />
      {{ connectedOrigin ? connectedOrigin.replace('http://', '').replace(':3000', '') : 'تنظیم سرور' }}
    </button>

    <Teleport to="body">
      <div v-if="open" class="fixed inset-0 z-100 flex items-end justify-center bg-ink/55 backdrop-blur-sm sm:items-center sm:p-5">
        <section class="w-full rounded-t-[1.75rem] bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-[1.75rem] sm:p-6">
          <div class="mb-5 flex items-start gap-3">
            <span class="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-900"><span class="i-lucide-monitor-smartphone h-5.5 w-5.5" /></span>
            <div><span class="text-[10px] font-800 text-brand-700">نسخه آزمایشی اندروید</span><h2 class="mb-0 mt-0.5 text-lg font-900">اتصال به سیستم فروشگاه</h2><p class="mb-0 mt-1 text-xs leading-5 text-muted">IP سیستمی که سرور روغن‌یار روی آن اجراست وارد کنید.</p></div>
          </div>

          <form @submit.prevent="connect">
            <label class="label">IP سیستم</label>
            <div class="relative" dir="ltr">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted">:3000</span>
              <input v-model="ip" class="field py-3.5 pl-15 text-left text-base font-700" inputmode="decimal" autocomplete="off" placeholder="192.168.1.10" autofocus>
            </div>
            <p v-if="error" class="mb-0 mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs leading-5 text-danger">{{ error }}</p>
            <div class="mt-3 rounded-xl bg-black/[.035] px-3 py-2.5 text-[10px] leading-5 text-muted">
              برای دیدن IP در ویندوز دستور <code dir="ltr" class="rounded bg-white px-1.5 py-0.5 text-ink">ipconfig</code> را اجرا و مقدار IPv4 را وارد کنید.
            </div>
            <button type="submit" class="btn-primary mt-4 min-h-12 w-full" :disabled="connecting">
              <span class="h-4.5 w-4.5" :class="connecting ? 'i-lucide-loader-circle animate-spin' : 'i-lucide-plug-zap'" />
              {{ connecting ? 'در حال بررسی اتصال…' : 'اتصال و ورود' }}
            </button>
            <button v-if="connectedOrigin" type="button" class="btn-ghost mt-1 w-full text-xs" @click="open = false">ادامه با تنظیم فعلی</button>
          </form>
        </section>
      </div>
    </Teleport>
  </template>
</template>
