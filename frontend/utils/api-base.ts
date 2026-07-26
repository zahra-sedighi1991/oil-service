const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

export function resolveApiBase(configuredBase: string) {
  if (!import.meta.client) return configuredBase

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
