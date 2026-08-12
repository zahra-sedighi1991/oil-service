export function publicBookUrl(token: string, configuredWebBase?: string) {
  if (!token) return ''

  const debugApiOrigin = import.meta.client
    ? localStorage.getItem('oil-service-debug-server-origin')
    : undefined
  const debugWebBase = debugApiOrigin
    ? debugApiOrigin.replace(/:\d+$/, ':3001')
    : undefined
  const configuredBase = (debugWebBase || configuredWebBase)?.trim().replace(/\/+$/, '')
  const webBase = configuredBase || (import.meta.client ? window.location.origin : '')
  return webBase ? `${webBase}/public/service-book/${encodeURIComponent(token)}` : ''
}
