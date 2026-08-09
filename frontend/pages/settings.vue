<script setup lang="ts">
import type { Shop } from '~/types/api'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'تنظیمات فروشگاه' })
const api = useApi()
const toast = useToast()
const { errorMessage } = useFormat()
const saving = ref(false)
const { data: shop, refresh } = await useAsyncData('shop-profile', () => api.get<Shop>('/shop/profile'))
const form = reactive({ name: '', ownerName: '', publicPhone: '', city: '', address: '', currency: 'TOMAN', timezone: 'Asia/Tehran' })
watch(shop, value => { if (value) Object.assign(form, value) }, { immediate: true })

async function save() {
  saving.value = true
  try {
    await api.patch('/shop/profile', form)
    toast.success('تنظیمات فروشگاه ذخیره شد.')
    await refresh()
  } catch (error) {
    toast.error(errorMessage(error))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
  <h1 class="mb-3 mt-1 text-xl font-800">تنظیمات فروشگاه</h1>
    <form class="card p-5 sm:p-7" @submit.prevent="save">
      <div class="grid gap-5 sm:grid-cols-2">
        <div><label class="label">نام فروشگاه</label><input v-model="form.name" class="field" required></div>
        <div><label class="label">نام مدیر</label><input v-model="form.ownerName" class="field" required></div>
        <div><label class="label">شماره تماس عمومی</label><input v-model="form.publicPhone" class="field text-left" dir="ltr" required></div>
        <div><label class="label">شهر</label><input v-model="form.city" class="field" required></div>
        <div class="sm:col-span-2"><label class="label">آدرس</label><textarea v-model="form.address" class="field min-h-24" /></div>
        <div><label class="label">واحد پول</label><select v-model="form.currency" class="field"><option value="TOMAN">تومان</option><option value="IRR">ریال</option></select></div>
        <div>
          <label class="label">منطقه زمانی</label>
          <select v-model="form.timezone" class="field">
            <option value="Asia/Tehran">زمان ایران (تهران)</option>
          </select>
        </div>
      </div>
      <div class="mt-7 flex items-center justify-between border-t border-black/6 pt-5">
        <span class="badge" :class="shop?.status === 'active' ? 'bg-brand-50 text-brand-700' : 'bg-amber-50 text-amber-700'">وضعیت: {{ shop?.status === 'active' ? 'فعال' : shop?.status }}</span>
        <button class="btn-primary" :disabled="saving"><span v-if="saving" class="i-lucide-loader-circle animate-spin" />ذخیره تغییرات</button>
      </div>
    </form>
  </div>
</template>
