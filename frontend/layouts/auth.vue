<template>
  <main class="relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
    <div class="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-300/20 blur-3xl" />
    <div class="absolute -bottom-30 -left-20 h-96 w-96 rounded-full bg-amber/15 blur-3xl" />
    <div class="relative z-1 w-full max-w-md">
      <NuxtLink to="/" class="mb-7 flex items-center justify-center gap-3 text-ink no-underline">
        <span class="grid h-12 w-12 place-items-center rounded-2xl bg-ink text-white shadow-xl">
          <span class="i-lucide-droplets h-6 w-6" />
        </span>
        <div>
          <strong class="block text-xl font-700">روغن‌یار</strong>
          <span class="text-xs text-ink/45">دفترچه سرویس دیجیتال</span>
        </div>
      </NuxtLink>
      <slot />
    </div>
  </main>
</template>
