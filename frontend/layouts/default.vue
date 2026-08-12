<script setup lang="ts">
const route = useRoute()
const { user, isAdmin, restoreUser, logout } = useAuth()
const mobileMenu = ref(false)

const shopNav = [
  { label: 'نمای کلی', to: '/dashboard', icon: 'i-lucide-layout-dashboard' },
  { label: 'ثبت سرویس', to: '/service-orders/new', icon: 'i-lucide-circle-plus' },
  { label: 'یادآوری سرویس', to: '/reminders', icon: 'i-lucide-bell-ring' },
  { label: 'مشتریان و خودروها', to: '/customers', icon: 'i-lucide-users' },
  { label: 'کاتالوگ و قیمت‌ها', to: '/catalog', icon: 'i-lucide-package-search' },
  { label: 'فاکتورها', to: '/invoices', icon: 'i-lucide-receipt-text' },
  { label: 'پیشنهادها', to: '/suggestions', icon: 'i-lucide-lightbulb' },
  { label: 'تنظیمات فروشگاه', to: '/settings', icon: 'i-lucide-settings-2' }
]
const adminNav = [
  { label: 'نمای کلی سامانه', to: '/admin', icon: 'i-lucide-layout-dashboard' },
  { label: 'فروشگاه‌ها', to: '/admin/shops', icon: 'i-lucide-store' },
  { label: 'کاتالوگ سراسری', to: '/admin/catalog', icon: 'i-lucide-library-big' },
  { label: 'پیشنهادها', to: '/admin/suggestions', icon: 'i-lucide-lightbulb' },
  { label: 'رویدادهای سامانه', to: '/admin/activity', icon: 'i-lucide-scroll-text' }
]
const nav = computed(() => isAdmin.value ? adminNav : shopNav)
const mobileNav = computed(() => isAdmin.value
  ? adminNav.filter(item => ['/admin', '/admin/shops', '/admin/catalog', '/admin/suggestions'].includes(item.to))
  : shopNav.filter(item => ['/dashboard', '/service-orders/new', '/customers', '/reminders'].includes(item.to)))

onMounted(restoreUser)
watch(() => route.fullPath, () => { mobileMenu.value = false })
function isNavActive(path: string) {
  return route.path === path || (path !== '/admin' && route.path.startsWith(`${path}/`))
}
</script>

<template>
  <div class="h-dvh overflow-hidden">
    <aside class="fixed bottom-4 right-4 top-4 z-50 hidden w-68 overflow-hidden rounded-[1.75rem] border border-black/6 bg-white/96 px-3.5 py-4 text-ink shadow-[0_18px_55px_rgba(0,0,0,.10)] backdrop-blur-xl lg:flex lg:flex-col">
      <NuxtLink :to="isAdmin ? '/admin' : '/dashboard'" class="mb-6 flex items-center gap-3 rounded-2xl px-2 py-1 text-ink no-underline">
        <span class="grid h-11 w-11 place-items-center rounded-2xl bg-brand-500 text-xl text-ink shadow-[0_8px_20px_rgba(250,189,50,.24)]">
          <span class="i-lucide-droplets h-6 w-6" />
        </span>
        <div>
          <strong class="block text-lg font-900">روغن‌یار</strong>
          <span class="text-xs text-muted">مدیریت هوشمند سرویس</span>
        </div>
      </NuxtLink>

      <nav class="sidebar-nav -mx-1 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain px-1 pb-3 pt-1.5">
        <NuxtLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-650 text-muted no-underline transition hover:bg-black/[.035] hover:text-ink"
          :class="isNavActive(item.to) ? '!bg-brand-50 !text-ink !ring-1 !ring-brand-200' : ''"
        >
          <span class="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-black/[.035] text-muted transition group-hover:bg-brand-100 group-hover:text-ink">
            <span class="h-4.5 w-4.5" :class="item.icon" />
          </span>
          {{ item.label }}
        </NuxtLink>
      </nav>

      <div class="rounded-2xl border border-black/6 bg-canvas/70 p-3">
        <div class="flex items-center gap-3">
          <span class="grid h-9 w-9 place-items-center rounded-xl bg-brand-100 text-sm font-900 text-brand-800">
            {{ user?.name?.slice(0, 1) || 'م' }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="m-0 truncate text-sm font-800">{{ user?.name || 'مدیر فروشگاه' }}</p>
            <p class="m-0 mt-0.5 text-[11px] text-muted">{{ isAdmin ? 'مدیر سامانه' : 'مدیر فضای کاری' }}</p>
          </div>
          <button class="grid h-9 w-9 place-items-center rounded-xl border-0 bg-transparent text-muted hover:bg-black/5 hover:text-danger" title="خروج" @click="logout">
            <span class="i-lucide-log-out h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </aside>

    <header class="fixed inset-x-3 top-3 z-40 flex h-14 items-center justify-between rounded-2xl border border-black/7 bg-white/92 px-2.5 shadow-[0_10px_30px_rgba(0,0,0,.08)] backdrop-blur-xl lg:hidden" style="top: max(0.75rem, env(safe-area-inset-top));">
      <button class="btn-ghost h-10 w-10 p-0" :aria-label="mobileMenu ? 'بستن منو' : 'نمایش منو'" :aria-expanded="mobileMenu" @click="mobileMenu = !mobileMenu">
        <span class="h-6 w-6" :class="mobileMenu ? 'i-lucide-x' : 'i-lucide-menu'" />
      </button>
      <NuxtLink :to="isAdmin ? '/admin' : '/dashboard'" class="flex items-center gap-2 text-ink no-underline">
        <span class="i-lucide-droplets h-5 w-5 text-brand-600" />
        <strong>روغن‌یار</strong>
      </NuxtLink>
      <NuxtLink :to="isAdmin ? '/admin/shops' : '/service-orders/new'" class="btn-primary h-10 w-10 p-0" :aria-label="isAdmin ? 'فروشگاه‌ها' : 'سرویس جدید'">
        <span class="h-5 w-5" :class="isAdmin ? 'i-lucide-store' : 'i-lucide-plus'" />
      </NuxtLink>
    </header>

    <main class="scroll-container h-dvh overflow-y-auto overscroll-contain px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-[calc(5.25rem+env(safe-area-inset-top))] sm:px-6 lg:mr-76 lg:px-8 lg:pb-8 lg:pt-8 xl:px-10">
      <div class="mx-auto min-h-full max-w-7xl">
        <slot />
      </div>
    </main>

    <nav
      class="fixed inset-x-4 z-40 grid rounded-[1.35rem] border border-black/8 bg-white/92 p-1.5 shadow-[0_14px_40px_rgba(0,0,0,.14)] backdrop-blur-xl lg:hidden"
      :class="mobileNav.length === 3 ? 'grid-cols-3' : 'grid-cols-4'"
      style="bottom: max(1rem, env(safe-area-inset-bottom));"
    >
      <NuxtLink v-for="item in mobileNav" :key="item.to" :to="item.to" class="flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-800 text-ink/65 no-underline transition" :class="isNavActive(item.to) ? '!bg-brand-100 !text-brand-900 !ring-1 !ring-brand-300 !shadow-sm' : ''">
        <span class="h-5 w-5" :class="item.icon" />
        <span class="whitespace-nowrap">{{ item.label.replace(' و خودروها', '') }}</span>
      </NuxtLink>
    </nav>

    <Teleport to="body">
      <Transition name="menu-panel">
        <div v-if="mobileMenu" class="fixed inset-0 z-50 bg-ink/20 backdrop-blur-[2px] lg:hidden" @click.self="mobileMenu = false">
          <section class="mobile-menu-panel fixed inset-x-3 overflow-hidden rounded-[1.35rem] border border-black/8 bg-white p-2.5 shadow-[0_18px_45px_rgba(0,0,0,.16)]" style="top: calc(max(0.75rem, env(safe-area-inset-top)) + 4rem);">
            <div class="mb-1 flex justify-end px-0.5">
              <button type="button" class="grid h-8 w-8 place-items-center rounded-full border border-black/7 bg-white text-muted shadow-sm transition active:scale-95" aria-label="بستن منو" @click="mobileMenu = false">
                <span class="i-lucide-x h-4 w-4" />
              </button>
            </div>
            <nav class="mobile-menu-scroll grid max-h-[min(65dvh,28rem)] grid-cols-3 gap-1.5 overflow-y-auto overscroll-contain pb-0.5">
              <NuxtLink v-for="item in nav" :key="item.to" :to="item.to" class="group flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border border-black/5 bg-black/[.018] px-1 py-2.5 text-center text-[11px] font-800 text-ink/80 no-underline transition active:scale-[.97]" :class="isNavActive(item.to) ? '!border-brand-300 !bg-brand-100 !text-brand-950 !shadow-[0_4px_12px_rgba(250,189,50,.16)]' : ''">
                <span class="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-brand-200/70 bg-brand-50 text-brand-900 shadow-[0_2px_7px_rgba(250,189,50,.10)] transition group-hover:border-brand-300 group-hover:bg-brand-100">
                  <span class="h-4.5 w-4.5" :class="item.icon" />
                </span>
                <span class="w-full truncate">{{ item.label }}</span>
              </NuxtLink>
            </nav>
            <button type="button" class="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-danger/12 bg-danger/5 px-3 py-2 text-xs font-700 text-danger transition active:scale-[.99]" @click="logout">
              <span class="i-lucide-log-out h-4 w-4" />
              خروج از حساب کاربری
            </button>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.sidebar-nav,
.mobile-menu-scroll {
  scrollbar-color: rgba(250, 189, 50, .9) rgba(0, 0, 0, .05);
  scrollbar-width: thin;
}

.sidebar-nav::-webkit-scrollbar,
.mobile-menu-scroll::-webkit-scrollbar { width: 5px; }
.sidebar-nav::-webkit-scrollbar-track,
.mobile-menu-scroll::-webkit-scrollbar-track { background: rgba(0, 0, 0, .04); border-radius: 999px; }
.sidebar-nav::-webkit-scrollbar-thumb,
.mobile-menu-scroll::-webkit-scrollbar-thumb { background: rgba(250, 189, 50, .9); border-radius: 999px; }

.menu-panel-enter-active, .menu-panel-leave-active { transition: opacity .18s ease; }
.menu-panel-enter-active .mobile-menu-panel, .menu-panel-leave-active .mobile-menu-panel { transition: opacity .18s ease, transform .18s ease; }
.menu-panel-enter-from, .menu-panel-leave-to { opacity: 0; }
.menu-panel-enter-from .mobile-menu-panel, .menu-panel-leave-to .mobile-menu-panel { opacity: 0; transform: translateY(-8px) scale(.98); }
</style>
