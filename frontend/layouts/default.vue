<script setup lang="ts">
const route = useRoute()
const { user, isAdmin, restoreUser, logout } = useAuth()
const mobileMenu = ref(false)

const shopNav = [
  { label: 'نمای کلی', to: '/', icon: 'i-lucide-layout-dashboard' },
  { label: 'ثبت سرویس', to: '/service-orders/new', icon: 'i-lucide-circle-plus' },
  { label: 'مشتریان و خودروها', to: '/customers', icon: 'i-lucide-users' },
  { label: 'کاتالوگ و قیمت‌ها', to: '/catalog', icon: 'i-lucide-package-search' },
  { label: 'فاکتورها', to: '/invoices', icon: 'i-lucide-receipt-text' },
  { label: 'پیشنهادها', to: '/suggestions', icon: 'i-lucide-lightbulb' },
  { label: 'تنظیمات فروشگاه', to: '/settings', icon: 'i-lucide-settings-2' }
]
const adminNav = [
  { label: 'مدیریت سامانه', to: '/admin', icon: 'i-lucide-shield-check' },
  { label: 'کاتالوگ سراسری', to: '/admin/catalog', icon: 'i-lucide-library-big' },
  { label: 'پیشنهادها', to: '/admin/suggestions', icon: 'i-lucide-lightbulb' }
]
const nav = computed(() => isAdmin.value ? adminNav : shopNav)

onMounted(restoreUser)
watch(() => route.fullPath, () => { mobileMenu.value = false })
</script>

<template>
  <div class="min-h-screen">
    <aside class="fixed inset-y-0 right-0 z-50 hidden w-66 border-l border-white/8 bg-ink px-4 py-5 text-white lg:flex lg:flex-col">
      <NuxtLink to="/" class="mb-8 flex items-center gap-3 px-2 text-white no-underline">
        <span class="grid h-11 w-11 place-items-center rounded-2xl bg-brand-500 text-xl shadow-lg">
          <span class="i-lucide-droplets h-6 w-6" />
        </span>
        <div>
          <strong class="block text-lg font-900">روغن‌یار</strong>
          <span class="text-xs text-white/45">مدیریت هوشمند سرویس</span>
        </div>
      </NuxtLink>

      <nav class="flex flex-1 flex-col gap-1">
        <NuxtLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-650 text-white/58 no-underline transition hover:bg-white/7 hover:text-white"
          active-class="!bg-brand-500/18 !text-brand-200"
        >
          <span class="h-5 w-5" :class="item.icon" />
          {{ item.label }}
        </NuxtLink>
      </nav>

      <div class="rounded-2xl border border-white/8 bg-white/5 p-3">
        <div class="flex items-center gap-3">
          <span class="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-sm font-900">
            {{ user?.name?.slice(0, 1) || 'م' }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="m-0 truncate text-sm font-800">{{ user?.name || 'مدیر فروشگاه' }}</p>
            <p class="m-0 mt-0.5 text-[11px] text-white/40">{{ isAdmin ? 'مدیر سامانه' : 'مدیر فضای کاری' }}</p>
          </div>
          <button class="grid h-9 w-9 place-items-center rounded-lg border-0 bg-transparent text-white/45 hover:bg-white/8 hover:text-white" title="خروج" @click="logout">
            <span class="i-lucide-log-out h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </aside>

    <header class="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-black/6 bg-canvas/90 px-4 backdrop-blur-xl lg:hidden">
      <button class="btn-ghost h-10 w-10 p-0" aria-label="نمایش منو" @click="mobileMenu = true">
        <span class="i-lucide-menu h-6 w-6" />
      </button>
      <NuxtLink to="/" class="flex items-center gap-2 text-ink no-underline">
        <span class="i-lucide-droplets h-5 w-5 text-brand-600" />
        <strong>روغن‌یار</strong>
      </NuxtLink>
      <NuxtLink to="/service-orders/new" class="btn-primary h-10 w-10 p-0" aria-label="سرویس جدید">
        <span class="i-lucide-plus h-5 w-5" />
      </NuxtLink>
    </header>

    <main class="min-h-screen px-4 pb-24 pt-6 sm:px-6 lg:mr-66 lg:px-8 lg:pb-10 lg:pt-8 xl:px-10">
      <div class="mx-auto max-w-7xl">
        <slot />
      </div>
    </main>

    <nav class="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-2xl border border-black/8 bg-white/94 p-1.5 shadow-2xl backdrop-blur-xl lg:hidden">
      <NuxtLink v-for="item in nav.slice(0, 4)" :key="item.to" :to="item.to" class="flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-700 text-ink/45 no-underline" active-class="!bg-brand-50 !text-brand-700">
        <span class="h-5 w-5" :class="item.icon" />
        {{ item.label.replace(' و خودروها', '') }}
      </NuxtLink>
    </nav>

    <Teleport to="body">
      <Transition name="drawer">
        <div v-if="mobileMenu" class="fixed inset-0 z-70 bg-ink/45 backdrop-blur-sm lg:hidden" @click.self="mobileMenu = false">
          <aside class="mr-auto flex h-full w-[min(86vw,22rem)] flex-col bg-ink p-5 text-white">
            <div class="mb-7 flex items-center justify-between">
              <strong class="text-lg">منوی روغن‌یار</strong>
              <button class="btn-ghost h-9 w-9 p-0 text-white" @click="mobileMenu = false"><span class="i-lucide-x h-5 w-5" /></button>
            </div>
            <nav class="flex flex-col gap-1">
              <NuxtLink v-for="item in nav" :key="item.to" :to="item.to" class="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/65 no-underline" active-class="!bg-white/10 !text-white">
                <span class="h-5 w-5" :class="item.icon" />{{ item.label }}
              </NuxtLink>
            </nav>
          </aside>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.drawer-enter-active, .drawer-leave-active { transition: opacity .2s ease; }
.drawer-enter-active aside, .drawer-leave-active aside { transition: transform .2s ease; }
.drawer-enter-from, .drawer-leave-to { opacity: 0; }
.drawer-enter-from aside, .drawer-leave-to aside { transform: translateX(100%); }
</style>
