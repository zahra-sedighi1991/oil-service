<script setup lang="ts">
const { toasts } = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-5 left-5 z-100 flex w-[min(90vw,24rem)] flex-col gap-2" aria-live="polite">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-xl backdrop-blur"
          :class="{
            'border-brand-200 bg-brand-50/95 text-brand-900': toast.tone === 'success',
            'border-red-200 bg-red-50/95 text-red-900': toast.tone === 'error',
            'border-black/10 bg-white/95 text-ink': toast.tone === 'info'
          }"
        >
          <span
            class="mt-0.5 h-5 w-5 shrink-0"
            :class="toast.tone === 'success' ? 'i-lucide-circle-check' : toast.tone === 'error' ? 'i-lucide-circle-alert' : 'i-lucide-info'"
          />
          <span class="leading-6">{{ toast.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active { transition: all .2s ease; }
.toast-enter-from,
.toast-leave-to { opacity: 0; transform: translateY(8px); }
</style>
