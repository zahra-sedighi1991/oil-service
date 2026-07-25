<script setup lang="ts">
import type { AuthResponse } from '~/types/api'

definePageMeta({ layout: 'auth', middleware: 'guest' })
useHead({ title: 'ورود' })

const api = useApi()
const auth = useAuth()
const toast = useToast()
const { errorMessage } = useFormat()

const step = ref<'mobile' | 'otp' | 'register'>('mobile')
const loading = ref(false)
const mobile = ref('')
const code = ref('')
const form = reactive({ name: '', shopName: '', city: '' })

async function requestOtp() {
  loading.value = true
  try {
    const response = await api.post<{ developmentCode?: string }>('/auth/otp/request', { mobile: mobile.value })
    step.value = 'otp'
    if (response.developmentCode) toast.info(`کد محیط توسعه: ${response.developmentCode}`)
  } catch (error) {
    toast.error(errorMessage(error))
  } finally {
    loading.value = false
  }
}

async function verify(includeRegistration = false) {
  loading.value = true
  try {
    const response = await api.post<AuthResponse & { registrationRequired?: boolean }>('/auth/otp/verify', {
      mobile: mobile.value,
      code: code.value,
      ...(includeRegistration ? form : {})
    })
    if (response.registrationRequired) {
      step.value = 'register'
      return
    }
    auth.setSession(response)
    toast.success('با موفقیت وارد شدید.')
    await navigateTo(response.user.role === 'super_admin' ? '/admin' : '/')
  } catch (error) {
    toast.error(errorMessage(error))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="card p-5 sm:p-7">
    <div class="mb-6">
      <span class="badge mb-3 bg-brand-50 text-brand-700">ورود امن با رمز یک‌بارمصرف</span>
      <h1 class="m-0 text-2xl font-950">
        {{ step === 'mobile' ? 'به روغن‌یار خوش آمدید' : step === 'otp' ? 'کد تأیید را وارد کنید' : 'ساخت فضای کاری' }}
      </h1>
      <p class="mb-0 mt-2 text-sm leading-6 text-ink/50">
        {{ step === 'mobile' ? 'برای مدیریت سریع مشتریان و سرویس خودرو وارد شوید.' : step === 'otp' ? `کد ارسال‌شده به ${mobile}` : 'اطلاعات اولیه فروشگاه را تکمیل کنید.' }}
      </p>
    </div>

    <form v-if="step === 'mobile'" class="space-y-4" @submit.prevent="requestOtp">
      <div>
        <label class="label">شماره موبایل</label>
        <input v-model="mobile" class="field text-left" dir="ltr" inputmode="tel" placeholder="0912 000 0000" autofocus required>
      </div>
      <button class="btn-primary w-full" :disabled="loading">
        <span v-if="loading" class="i-lucide-loader-circle animate-spin" />
        دریافت کد ورود
      </button>
    </form>

    <form v-else-if="step === 'otp'" class="space-y-4" @submit.prevent="verify(false)">
      <div>
        <label class="label">رمز یک‌بارمصرف</label>
        <input v-model="code" class="field text-center text-xl tracking-[.45em]" dir="ltr" inputmode="numeric" maxlength="6" placeholder="••••••" autofocus required>
      </div>
      <button class="btn-primary w-full" :disabled="loading">
        <span v-if="loading" class="i-lucide-loader-circle animate-spin" />
        تأیید و ورود
      </button>
      <button type="button" class="btn-ghost w-full" @click="step = 'mobile'">اصلاح شماره موبایل</button>
    </form>

    <form v-else class="space-y-4" @submit.prevent="verify(true)">
      <div>
        <label class="label">نام مدیر</label>
        <input v-model="form.name" class="field" placeholder="مثلاً علی رضایی" required>
      </div>
      <div>
        <label class="label">نام فروشگاه</label>
        <input v-model="form.shopName" class="field" placeholder="مثلاً سرویس خودرو پارس" required>
      </div>
      <div>
        <label class="label">شهر</label>
        <input v-model="form.city" class="field" placeholder="تهران" required>
      </div>
      <button class="btn-primary w-full" :disabled="loading">
        <span v-if="loading" class="i-lucide-loader-circle animate-spin" />
        ساخت فروشگاه و ورود
      </button>
    </form>

    <p class="mb-0 mt-6 border-t border-black/6 pt-5 text-center text-xs leading-5 text-ink/40">
      با ورود، قوانین استفاده و سیاست حفظ حریم خصوصی را می‌پذیرید.
    </p>
  </section>
</template>
