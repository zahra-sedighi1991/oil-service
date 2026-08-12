import type { CapacitorConfig } from '@capacitor/cli'

const configuredApiUsesHttps = process.env.NUXT_PUBLIC_API_BASE?.startsWith('https://') === true
const allowMixedContent = process.env.CAPACITOR_ALLOW_MIXED_CONTENT === 'true'
  || (!configuredApiUsesHttps && process.env.CAPACITOR_ALLOW_MIXED_CONTENT !== 'false')

const config: CapacitorConfig = {
  appId: 'ir.roghanyar.app',
  appName: 'روغن‌یار',
  webDir: '.output/public',
  backgroundColor: '#F4F4F2',
  loggingBehavior: 'debug',
  server: {
    androidScheme: 'https'
  },
  android: {
    backgroundColor: '#F4F4F2',
    allowMixedContent
  }
}

export default config
