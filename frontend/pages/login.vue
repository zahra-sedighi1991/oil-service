<script setup lang="ts">
import type { AuthResponse } from '~/types/api'

definePageMeta({ layout: 'auth', middleware: 'guest' })
useHead({ title: 'ورود و ثبت‌نام' })

const api = useApi()
const route = useRoute()
const auth = useAuth()
const toast = useToast()
const { errorMessage } = useFormat()

const mode = ref<'login' | 'register'>(route.query.mode === 'register' ? 'register' : 'login')
const loading = ref(false)
const showPassword = ref(false)
const loginForm = reactive({ mobile: '', password: '' })
const registerForm = reactive({
  name: '',
  mobile: '',
  password: '',
  passwordConfirmation: '',
  shopName: '',
  city: 'مشهد'
})

async function login() {
  loading.value = true
  try {
    const response = await api.post<AuthResponse>('/auth/password/login', loginForm)
    auth.setSession(response)
    toast.success('با موفقیت وارد شدید.')
    await navigateTo(response.user.role === 'super_admin' ? '/admin' : '/dashboard')
  } catch (error) {
    toast.error(errorMessage(error))
  } finally {
    loading.value = false
  }
}

async function register() {
  if (registerForm.password !== registerForm.passwordConfirmation) {
    return toast.error('رمز عبور و تکرار آن یکسان نیستند.')
  }
  loading.value = true
  try {
    const { passwordConfirmation, ...body } = registerForm
    const response = await api.post<AuthResponse>('/auth/password/register', body)
    auth.setSession(response)
    toast.success('فروشگاه شما ساخته شد؛ خوش آمدید.')
    await navigateTo('/dashboard')
  } catch (error) {
    toast.error(errorMessage(error))
  } finally {
    loading.value = false
  }
}

function switchMode(nextMode: 'login' | 'register') {
  mode.value = nextMode
  showPassword.value = false
}
</script>

<template>
  <section class="card p-5 sm:p-7">
    <div class="mb-6">
      <h1 class="m-0 text-2xl font-800">
        {{ mode === 'login' ? 'به روغن‌یار خوش آمدید' : 'فروشگاه خود را بسازید' }}
      </h1>
      <p class="mb-0 mt-2 text-sm leading-6 text-muted">
        {{ mode === 'login'
          ? 'شماره موبایل و رمز عبور حساب خود را وارد کنید.'
          : 'اطلاعات اولیه را وارد کنید؛ پس از ثبت‌نام مستقیماً وارد پنل می‌شوید.' }}
      </p>
    </div>

    <div class="mb-6 grid grid-cols-2 rounded-xl bg-black/5 p-1">
      <button
        type="button"
        class="rounded-lg border-0 px-3 py-2.5 text-sm font-800 transition"
        :class="mode === 'login' ? 'bg-white text-ink shadow-sm' : 'bg-transparent text-muted'"
        @click="switchMode('login')"
      >
        ورود
      </button>
      <button
        type="button"
        class="rounded-lg border-0 px-3 py-2.5 text-sm font-800 transition"
        :class="mode === 'register' ? 'bg-white text-ink shadow-sm' : 'bg-transparent text-muted'"
        @click="switchMode('register')"
      >
        ثبت‌نام اولیه
      </button>
    </div>

    <form v-if="mode === 'login'" class="space-y-4" @submit.prevent="login">
      <div>
        <label class="label">شماره موبایل</label>
        <input
          v-model="loginForm.mobile"
          class="field text-left"
          dir="ltr"
          inputmode="tel"
          autocomplete="username"
          placeholder="09120000000"
          autofocus
          required
        >
      </div>
      <div>
        <label class="label">رمز عبور</label>
        <div class="relative">
          <input
            v-model="loginForm.password"
            :type="showPassword ? 'text' : 'password'"
            class="field pl-11 text-left"
            dir="ltr"
            minlength="6"
            autocomplete="current-password"
            placeholder="حداقل ۶ کاراکتر"
            required
          >
          <button
            type="button"
            class="absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg border-0 bg-transparent text-muted hover:bg-black/5 hover:text-ink"
            :aria-label="showPassword ? 'پنهان کردن رمز' : 'نمایش رمز'"
            @click="showPassword = !showPassword"
          >
            <span class="h-4.5 w-4.5" :class="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'" />
          </button>
        </div>
      </div>
      <button class="btn-primary w-full" :disabled="loading">
        <span v-if="loading" class="i-lucide-loader-circle animate-spin" />
        ورود به پنل
      </button>
      <button type="button" class="btn-ghost w-full" @click="switchMode('register')">
        هنوز حساب ندارید؟ ثبت‌نام کنید
      </button>
    </form>

    <form v-else class="registration-form space-y-4" @submit.prevent="register">
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="label">نام مدیر</label>
          <input v-model="registerForm.name" class="field" autocomplete="name" placeholder="علی رضایی" required>
        </div>
        <div>
          <label class="label">شماره موبایل</label>
          <input
            v-model="registerForm.mobile"
            class="field text-left"
            dir="ltr"
            inputmode="tel"
            autocomplete="username"
            placeholder="09120000000"
            required
          >
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="label">نام فروشگاه</label>
          <input v-model="registerForm.shopName" class="field" placeholder="سرویس خودرو پارس" required>
        </div>
        <div>
          <label class="label">شهر</label>
          <input v-model="registerForm.city" class="field" placeholder="مشهد" required>
        </div>
      </div>

      <div>
        <label class="label">رمز عبور</label>
        <input
          v-model="registerForm.password"
          :type="showPassword ? 'text' : 'password'"
          class="field text-left"
          dir="ltr"
          minlength="6"
          autocomplete="new-password"
          placeholder="حداقل ۶ کاراکتر"
          required
        >
      </div>
      <div>
        <label class="label">تکرار رمز عبور</label>
        <input
          v-model="registerForm.passwordConfirmation"
          :type="showPassword ? 'text' : 'password'"
          class="field text-left"
          dir="ltr"
          minlength="6"
          autocomplete="new-password"
          required
        >
      </div>

      <label class="flex cursor-pointer items-center gap-2 text-xs text-muted">
        <input v-model="showPassword" type="checkbox" class="h-4 w-4 accent-brand-600">
        نمایش رمزهای عبور
      </label>

      <button class="btn-primary w-full" :disabled="loading">
        <span v-if="loading" class="i-lucide-loader-circle animate-spin" />
        ساخت فروشگاه و ورود
      </button>
    </form>

    <!-- <div class="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">
      ورود با OTP فعلاً غیرفعال است و در نسخه بعد دوباره به این صفحه اضافه می‌شود.
    </div> -->
  </section>
</template>

<style scoped>
.registration-form .label {
  color: rgba(23, 23, 23, .8);
  font-weight: 800;
}

.registration-form .field {
  border-color: rgba(23, 23, 23, .24);
  background: #fff;
  box-shadow: 0 1px 2px rgba(23, 23, 23, .04), inset 0 0 0 1px rgba(23, 23, 23, .025);
}

.registration-form .field::placeholder {
  color: rgba(23, 23, 23, .44);
}

.registration-form .field:focus {
  border-color: #df9e18;
  box-shadow: 0 0 0 3px rgba(250, 189, 50, .22);
}
</style>
