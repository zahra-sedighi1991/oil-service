import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const nuxtCli = fileURLToPath(new URL('../node_modules/nuxt/bin/nuxt.mjs', import.meta.url))
const environment = {
  ...process.env,
  CAPACITOR_BUILD: 'true'
}

if (!environment.NUXT_PUBLIC_API_BASE) {
  environment.NUXT_PUBLIC_API_BASE = 'http://10.0.2.2:3000/api/v1'
  environment.NUXT_PUBLIC_PUBLIC_API_BASE = 'http://10.0.2.2:3000'
  environment.CAPACITOR_ALLOW_MIXED_CONTENT = 'true'
  console.warn('Mobile API URL is not configured; using the Android emulator host (10.0.2.2:3000).')
}

const result = spawnSync(process.execPath, [nuxtCli, 'generate'], {
  cwd: process.cwd(),
  env: environment,
  stdio: 'inherit'
})

if (result.error) throw result.error
process.exit(result.status ?? 1)
