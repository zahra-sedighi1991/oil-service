<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'admin'] })
useHead({ title: 'کاتالوگ سراسری' })
const api = useApi()
const toast = useToast()
const { errorMessage } = useFormat()
const tab = ref<'brands' | 'types' | 'services'>('brands')
const tabs = [
  { key: 'brands', label: 'برند خودرو' },
  { key: 'types', label: 'نوع محصول' },
  { key: 'services', label: 'خدمات' }
] as const
const modal = ref(false)
const form = reactive({ nameFa: '', nameEn: '', slug: '', key: '', title: '', name: '', category: '' })
const { data: brands, refresh: refreshBrands } = await useAsyncData('admin-brands', () => api.get<any[]>('/catalog/vehicle-brands'))
const { data: types, refresh: refreshTypes } = await useAsyncData('admin-types', () => api.get<any[]>('/catalog/product-types'))
const { data: services, refresh: refreshServices } = await useAsyncData('admin-services', () => api.get<any[]>('/catalog/services'))
const items = computed(() => tab.value === 'brands' ? brands.value : tab.value === 'types' ? types.value : services.value)

async function createItem() {
  try {
    if (tab.value === 'brands') {
      await api.post('/admin/catalog/vehicle-brands', { nameFa: form.nameFa, nameEn: form.nameEn || undefined, slug: form.slug })
      await refreshBrands()
    } else if (tab.value === 'types') {
      await api.post('/admin/catalog/product-types', { key: form.key, title: form.title })
      await refreshTypes()
    } else {
      await api.post('/admin/catalog/services', { name: form.name, category: form.category || undefined })
      await refreshServices()
    }
    modal.value = false
    Object.keys(form).forEach(key => (form as any)[key] = '')
    toast.success('رکورد کاتالوگ ایجاد شد.')
  } catch (error) { toast.error(errorMessage(error)) }
}
</script>

<template>
  <div>
    <header class="mb-6 flex items-end justify-between"><div><p class="m-0 text-sm font-700 text-brand-700">اطلاعات پایه</p><h1 class="mb-0 mt-1 text-2xl font-950">کاتالوگ سراسری</h1></div><button class="btn-primary" @click="modal = true"><span class="i-lucide-plus" />رکورد جدید</button></header>
    <div class="mb-4 inline-flex rounded-xl bg-black/5 p-1"><button v-for="item in tabs" :key="item.key" class="rounded-lg border-0 px-4 py-2 text-sm font-700" :class="tab === item.key ? 'bg-white shadow-sm' : 'bg-transparent text-ink/45'" @click="tab = item.key">{{ item.label }}</button></div>
    <section class="card overflow-hidden"><div v-if="items?.length" class="divide-y divide-black/5"><div v-for="item in items" :key="item.id" class="flex items-center justify-between px-5 py-4"><div><strong class="text-sm">{{ item.nameFa || item.title || item.name }}</strong><span class="mt-1 block text-xs text-ink/40">{{ item.slug || item.key || item.category }}</span></div><span class="badge bg-brand-50 text-brand-700">فعال</span></div></div><AppEmptyState v-else title="رکوردی وجود ندارد" /></section>
    <AppModal :open="modal" title="رکورد جدید کاتالوگ" @close="modal = false">
      <form class="space-y-4" @submit.prevent="createItem">
        <template v-if="tab === 'brands'"><div><label class="label">نام فارسی</label><input v-model="form.nameFa" class="field" required></div><div><label class="label">نام لاتین</label><input v-model="form.nameEn" class="field"></div><div><label class="label">نامک</label><input v-model="form.slug" class="field text-left" dir="ltr" required></div></template>
        <template v-else-if="tab === 'types'"><div><label class="label">عنوان</label><input v-model="form.title" class="field" required></div><div><label class="label">کلید فنی</label><input v-model="form.key" class="field text-left" dir="ltr" required></div></template>
        <template v-else><div><label class="label">نام خدمت</label><input v-model="form.name" class="field" required></div><div><label class="label">دسته‌بندی</label><input v-model="form.category" class="field"></div></template>
        <button class="btn-primary w-full">ایجاد رکورد</button>
      </form>
    </AppModal>
  </div>
</template>
