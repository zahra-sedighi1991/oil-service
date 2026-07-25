<script setup lang="ts">
withDefaults(defineProps<{
  icon?: string
  title: string
  description?: string
}>(), { icon: 'i-lucide-inbox' })
</script>

<template>
  <div class="flex min-h-52 flex-col items-center justify-center px-6 py-10 text-center">
    <span class="mb-4 h-10 w-10 text-ink/25" :class="icon" />
    <h3 class="m-0 text-base font-800">{{ title }}</h3>
    <p v-if="description" class="mb-0 mt-2 max-w-md text-sm leading-6 text-ink/50">{{ description }}</p>
    <div class="mt-5"><slot /></div>
  </div>
</template>
