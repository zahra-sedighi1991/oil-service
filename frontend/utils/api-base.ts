const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])
export const DEBUG_SERVER_STORAGE_KEY = 'oil-service-debug-server-origin'

export function debugServerOrigin() {
  if (!import.meta.client) return ''
  return localStorage.getItem(DEBUG_SERVER_STORAGE_KEY)?.replace(/\/+$/, '') ?? ''
}

export function resolveApiBase(configuredBase: string) {
  if (!import.meta.client) return configuredBase

  const debugOrigin = debugServerOrigin()
  if (debugOrigin) return `${debugOrigin}/api/v1`

  try {
    const url = new URL(configuredBase)
    const pageHostname = window.location.hostname
    if (LOOPBACK_HOSTS.has(url.hostname) && !LOOPBACK_HOSTS.has(pageHostname)) {
      url.hostname = pageHostname
    }
    return url.toString().replace(/\/$/, '')
  } catch {
    return configuredBase
  }
}
