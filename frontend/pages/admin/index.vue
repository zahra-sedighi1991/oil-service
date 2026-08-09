<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'admin'] })
useHead({ title: 'مدیریت سامانه' })
const api = useApi()
const toast = useToast()
const { dateTime, errorMessage, number } = useFormat()
interface AdminShop { id: string; name: string; ownerName: string; city: string; publicPhone: string; status: string; createdAt: string }
const { data: shops, refresh } = await useAsyncData('admin-shops', () => api.get<AdminShop[]>('/admin/shops'))
const counts = computed(() => ({
  all: shops.value?.length || 0,
  active: shops.value?.filter(item => item.status === 'active').length || 0,
  pending: shops.value?.filter(item => item.status === 'pending').length || 0,
  suspended: shops.value?.filter(item => item.status === 'suspended').length || 0
}))
async function changeStatus(shop: AdminShop, status: string) {
  try {
    await api.patch(`/admin/shops/${shop.id}/status`, { status })
    toast.success('وضعیت فروشگاه تغییر کرد.')
    await refresh()
  } catch (error) {
    toast.error(errorMessage(error))
  }
}
function onStatusChange(shop: AdminShop, event: Event) {
  changeStatus(shop, (event.target as HTMLSelectElement).value)
}
</script>

<template>
  <div class="list-page">
    <div class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div v-for="item in [{ label: 'همه فروشگاه‌ها', value: counts.all }, { label: 'فعال', value: counts.active }, { label: 'در انتظار', value: counts.pending }, { label: 'تعلیق‌شده', value: counts.suspended }]" :key="item.label" class="card p-4"><strong class="text-2xl font-800">{{ number(item.value) }}</strong><span class="mt-1 block text-xs text-muted">{{ item.label }}</span></div>
    </div>
    <section class="card list-panel">
      <header class="border-b border-black/6 px-5 py-4"><h2 class="m-0 text-base font-700">فروشگاه‌ها</h2></header>
      <div v-if="shops?.length" class="scroll-container list-scroll divide-y divide-black/5">
        <div v-for="shop in shops" :key="shop.id" class="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
          <div><strong class="block text-sm">{{ shop.name }}</strong><span class="mt-1 block text-xs text-muted">{{ shop.ownerName }} • {{ shop.city }}</span></div>
          <div class="text-xs text-muted"><span dir="ltr">{{ shop.publicPhone }}</span><span class="mt-1 block">{{ dateTime(shop.createdAt) }}</span></div>
          <select :value="shop.status" class="field py-2 sm:w-36" @change="onStatusChange(shop, $event)">
            <option value="pending">در انتظار</option><option value="active">فعال</option><option value="suspended">تعلیق</option><option value="closed">بسته</option>
          </select>
        </div>
      </div>
      <AppEmptyState v-else title="فروشگاهی ثبت نشده" />
    </section>
  </div>
</template>
