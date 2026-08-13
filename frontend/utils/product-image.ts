import { debugServerOrigin, resolveApiBase } from '~/utils/api-base'

export function useProductImageUrl() {
  const config = useRuntimeConfig()
  return (path?: string) => {
    if (!path) return ''
    if (/^https?:\/\//i.test(path)) return path
    if (import.meta.client) {
      const debugOrigin = debugServerOrigin()
      if (debugOrigin) return `${debugOrigin}/api/v1/${path.replace(/^\//, '')}`
    }
    return `${resolveApiBase(config.public.apiBase).replace(/\/$/, '')}/${path.replace(/^\//, '')}`
  }
}
