export default defineNuxtConfig({
  srcDir: '.',
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  devServer: { port: 3001 },
  modules: ['@unocss/nuxt', '@nuxtjs/color-mode'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'fa', dir: 'rtl' },
      title: 'روغن‌یار',
      titleTemplate: '%s | روغن‌یار',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#101b16' },
        { name: 'robots', content: 'noindex, nofollow' }
      ]
    }
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? 'http://localhost:3000/api/v1',
      publicApiBase: process.env.NUXT_PUBLIC_PUBLIC_API_BASE ?? 'http://localhost:3000'
    }
  },
  colorMode: {
    classSuffix: '',
    preference: 'light',
    fallback: 'light'
  },
  typescript: {
    strict: true,
    typeCheck: false
  }
})
