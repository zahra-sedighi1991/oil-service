<script setup lang="ts">
definePageMeta({ layout: false })
useHead({
  title: 'روغن‌یار | مدیریت ساده تعویض‌روغنی',
  meta: [{ name: 'description', content: 'ثبت سرویس، صدور فاکتور و پیگیری موعد مشتریان برای تعویض‌روغنی‌ها' }]
})

const { isAuthenticated } = useAuth()
const config = useRuntimeConfig()
const primaryLink = computed(() => isAuthenticated.value ? '/dashboard' : '/login?mode=register')
const primaryLabel = computed(() => isAuthenticated.value ? 'ورود به پنل' : 'شروع رایگان')
const apkDownloadUrl = computed(() => `${String(config.public.publicApiBase).replace(/\/$/, '')}/api/v1/app-update/android/apk`)

const benefits = [
  { icon: 'i-lucide-file-plus-2', title: 'سرویس را سریع ثبت کنید', text: 'مشخصات خودرو، کیلومتر و خدمات انجام‌شده را یک‌جا ثبت کنید.' },
  { icon: 'i-lucide-receipt-text', title: 'فاکتور مرتب تحویل دهید', text: 'فاکتور دیجیتال بسازید و لینک دفترچه سرویس را برای مشتری بفرستید.' },
  { icon: 'i-lucide-bell-ring', title: 'مشتری را برگردانید', text: 'موعد بعدی را پیدا کنید و با پیامک سیم‌کارت خودتان پیگیری کنید.' }
]
</script>

<template>
  <main class="min-h-dvh overflow-hidden bg-canvas text-ink">
    <header class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
      <NuxtLink to="/" class="flex items-center gap-2.5 text-ink no-underline">
        <span class="grid h-10 w-10 place-items-center rounded-xl bg-brand-500 shadow-[0_8px_20px_rgba(250,189,50,.25)]"><span class="i-lucide-droplets h-5 w-5" /></span>
        <strong class="text-lg font-900">روغن‌یار</strong>
      </NuxtLink>
      <NuxtLink :to="isAuthenticated ? '/dashboard' : '/login'" class="btn-primary min-h-11 px-6 text-sm no-underline">{{ isAuthenticated ? 'پنل من' : 'ورود' }}</NuxtLink>
    </header>

    <section class="relative mx-auto grid max-w-6xl items-center gap-7 px-4 pb-10 pt-5 sm:px-6 sm:pt-9 lg:grid-cols-[1.05fr_.95fr] lg:pb-14 lg:pt-10">
      <div class="relative z-1 text-center lg:text-right">
        <h1 class="mx-auto mb-0 mt-2 max-w-2xl text-[1.75rem] font-900 leading-[1.45] sm:text-[2.65rem] sm:leading-[1.35] lg:mx-0">
          سرویس خودرو را ثبت کنید؛
          <span class="relative whitespace-nowrap"><span class="relative z-1">مشتری را فراموش نکنید.</span><span class="absolute inset-x-0 bottom-1 h-3 -rotate-1 rounded-full bg-brand-300/55" /></span>
        </h1>
        <p class="mx-auto mb-0 mt-4 max-w-xl text-sm leading-7 text-muted sm:text-base sm:leading-8 lg:mx-0">روغن‌یار دفتر کار دیجیتال تعویض‌روغنی شماست؛ از ثبت سرویس و فاکتور تا یادآوری موعد بعدی مشتری.</p>
        <div class="mt-5 flex flex-col gap-2.5 sm:flex-row sm:justify-center lg:justify-start">
          <NuxtLink :to="primaryLink" class="btn-primary min-h-12 px-6 no-underline"><span class="i-lucide-arrow-left h-5 w-5" />{{ primaryLabel }}</NuxtLink>
          <a :href="apkDownloadUrl" class="btn-secondary min-h-12 px-6 no-underline"><span class="i-lucide-download h-5 w-5" />دانلود نسخه اندروید</a>
          <a href="#how-it-works" class="btn-secondary min-h-12 px-6 no-underline">ببینید چطور کار می‌کند</a>
        </div>
        <div class="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[11px] text-muted lg:justify-start">
          <span class="flex items-center gap-1.5"><span class="i-lucide-check h-4 w-4 text-emerald-600" />مناسب موبایل</span>
          <span class="flex items-center gap-1.5"><span class="i-lucide-check h-4 w-4 text-emerald-600" />بدون پنل پیامک</span>
          <span class="flex items-center gap-1.5"><span class="i-lucide-check h-4 w-4 text-emerald-600" />راه‌اندازی سریع</span>
        </div>
      </div>

      <div class="relative mx-auto w-full max-w-md lg:max-w-none">
        <div class="absolute -inset-8 rounded-full bg-brand-300/20 blur-3xl" />
        <div class="relative rounded-[2rem] border border-black/8 bg-white p-3 shadow-[0_30px_80px_rgba(0,0,0,.12)] sm:p-4">
          <div class="mb-4 flex items-center justify-between px-1"><div><strong class="text-sm">کارهای امروز</strong><span class="mt-0.5 block text-[10px] text-muted">همه چیز برای پیگیری آماده است</span></div><span class="grid h-9 w-9 place-items-center rounded-xl bg-brand-100"><span class="i-lucide-layout-dashboard h-4.5 w-4.5" /></span></div>
          <div class="grid grid-cols-3 gap-2">
            <div class="rounded-2xl bg-red-50 p-3"><strong class="block text-xl text-red-700">۳</strong><span class="text-[9px] text-red-700/70">موعد گذشته</span></div>
            <div class="rounded-2xl bg-blue-50 p-3"><strong class="block text-xl text-blue-700">۲</strong><span class="text-[9px] text-blue-700/70">نیازمند تماس</span></div>
            <div class="rounded-2xl bg-brand-50 p-3"><strong class="block text-xl text-brand-800">۵</strong><span class="text-[9px] text-brand-800/70">موعد نزدیک</span></div>
          </div>
          <div class="mt-3 grid gap-2">
            <div v-for="item in [{ name: 'علی رضایی', car: 'پژو ۲۰۶', action: 'آماده ارسال پیامک', tone: 'bg-brand-50 text-brand-800', icon: 'i-lucide-message-square-text' }, { name: 'مهدی احمدی', car: 'پراید', action: 'نیازمند تماس', tone: 'bg-blue-50 text-blue-800', icon: 'i-lucide-phone-call' }]" :key="item.name" class="flex items-center gap-3 rounded-2xl border border-black/6 p-3">
              <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl" :class="item.tone"><span class="h-4.5 w-4.5" :class="item.icon" /></span>
              <div class="min-w-0 flex-1"><strong class="block text-xs">{{ item.name }}</strong><span class="mt-0.5 block text-[10px] text-muted">{{ item.car }}</span></div>
              <span class="rounded-lg px-2 py-1 text-[9px] font-800" :class="item.tone">{{ item.action }}</span>
            </div>
          </div>
          <div class="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 text-xs font-800 text-white"><span class="i-lucide-plus h-4 w-4 text-brand-400" />ثبت سرویس جدید</div>
        </div>
      </div>
    </section>

    <section id="how-it-works" class="border-y border-black/6 bg-white/65 px-4 py-10 sm:px-6 sm:py-12">
      <div class="mx-auto max-w-6xl">
        <div class="mx-auto max-w-xl text-center"><span class="text-xs font-800 text-brand-700">ساده و کاربردی</span><h2 class="mb-0 mt-2 text-2xl font-900 sm:text-3xl">سه کاری که هر روز انجام می‌دهید</h2></div>
        <div class="mt-6 grid gap-3 md:grid-cols-3 md:gap-4">
          <article v-for="(benefit, index) in benefits" :key="benefit.title" class="rounded-[1.5rem] border border-black/6 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,.04)]">
            <div class="mb-3 flex items-center justify-between"><span class="grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand-900"><span class="h-5 w-5" :class="benefit.icon" /></span><span class="text-xs font-900 text-black/15">۰{{ index + 1 }}</span></div>
            <h3 class="m-0 text-base font-900">{{ benefit.title }}</h3><p class="mb-0 mt-2 text-xs leading-6 text-muted">{{ benefit.text }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="px-4 py-10 sm:px-6 sm:py-12">
      <div class="mx-auto flex max-w-4xl flex-col items-center gap-4 rounded-[2rem] bg-ink px-5 py-7 text-center text-white shadow-xl sm:px-10 sm:py-9">
        <span class="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500 text-ink"><span class="i-lucide-droplets h-6 w-6" /></span>
        <div><h2 class="m-0 text-2xl font-900">دفتر تعویض‌روغنی را دیجیتال کنید</h2><p class="mb-0 mt-2 text-sm leading-7 text-white/65">اولین مشتری و خودرو را ثبت کنید؛ ادامه کار را روغن‌یار مرتب نگه می‌دارد.</p></div>
        <NuxtLink :to="primaryLink" class="btn-primary min-h-12 px-7 no-underline">{{ primaryLabel }}</NuxtLink>
      </div>
    </section>

    <footer class="border-t border-black/6 px-4 py-6 sm:px-6"><div class="mx-auto flex max-w-6xl items-center justify-between text-xs text-muted"><span>روغن‌یار؛ مدیریت ساده سرویس خودرو</span><NuxtLink :to="isAuthenticated ? '/dashboard' : '/login'" class="font-800 text-ink no-underline">{{ isAuthenticated ? 'ورود به پنل' : 'ورود' }}</NuxtLink></div></footer>
  </main>
</template>
