export function publicBookUrl(token: string, configuredWebBase?: string) {
  if (!token) return ''

  const configuredBase = configuredWebBase?.trim().replace(/\/+$/, '')
  const webBase = configuredBase || (import.meta.client ? window.location.origin : '')
  return webBase ? `${webBase}/public/service-book/${encodeURIComponent(token)}` : ''
}
