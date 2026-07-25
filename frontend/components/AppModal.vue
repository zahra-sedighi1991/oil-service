<script setup lang="ts">
defineProps<{ open: boolean; title: string; description?: string }>()
const emit = defineEmits<{ close: [] }>()

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="fixed inset-0 z-80 flex items-end justify-center bg-ink/45 p-0 backdrop-blur-sm sm:items-center sm:p-5" @click.self="emit('close')">
        <section class="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-surface p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-6">
          <header class="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 class="m-0 text-lg font-900">{{ title }}</h2>
              <p v-if="description" class="mb-0 mt-1 text-sm leading-6 text-ink/50">{{ description }}</p>
            </div>
            <button class="btn-ghost h-9 w-9 p-0" aria-label="بستن" @click="emit('close')">
              <span class="i-lucide-x h-5 w-5" />
            </button>
          </header>
          <slot />
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active { transition: opacity .18s ease; }
.modal-enter-active section,
.modal-leave-active section { transition: transform .18s ease; }
.modal-enter-from,
.modal-leave-to { opacity: 0; }
.modal-enter-from section,
.modal-leave-to section { transform: translateY(16px) scale(.99); }
</style>
