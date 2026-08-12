const capacitorBuild = process.env.CAPACITOR_BUILD === 'true'
const defaultApiOrigin = capacitorBuild ? 'http://10.0.2.2:3000' : 'http://localhost:3000'

export default defineNuxtConfig({
  srcDir: '.',
  ssr: !capacitorBuild,
  compatibilityDate: '2025-07-15',
  devtools: { enabled: process.env.NODE_ENV !== 'production' && !capacitorBuild },
  devServer: { port: 3001 },
  modules: ['@unocss/nuxt', '@nuxtjs/color-mode'],
  css: ['~/assets/css/main.css', '~/assets/css/scroll-container.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'fa', dir: 'rtl' },
      title: 'روغن‌یار',
      titleTemplate: '%s | روغن‌یار',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#19362D' },
        {
          name: 'robots',
          content: process.env.NUXT_PUBLIC_ROBOTS
            ?? (process.env.NODE_ENV === 'production' ? 'index, follow' : 'noindex, nofollow')
        }
      ]
    }
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? `${defaultApiOrigin}/api/v1`,
      publicApiBase: process.env.NUXT_PUBLIC_PUBLIC_API_BASE ?? defaultApiOrigin,
      webBase: process.env.NUXT_PUBLIC_WEB_BASE ?? (capacitorBuild ? 'http://10.0.2.2:3001' : '')
    }
  },
  hooks: capacitorBuild
    ? {
        'prerender:routes'({ routes }) {
          routes.clear()
        }
      }
    : {},
  routeRules: {
    '/public/service-book/**': {
      headers: {
        'cache-control': 'no-store, max-age=0',
        'referrer-policy': 'no-referrer',
        'x-robots-tag': 'noindex, nofollow, noarchive'
      }
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
