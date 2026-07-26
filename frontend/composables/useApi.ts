import { resolveApiBase } from '~/utils/api-base'

export function useApi() {
  const config = useRuntimeConfig()
  const token = useCookie<string | null>('oil-service-token', {
    sameSite: 'lax',
    maxAge: 60 * 60 * 12
  })

  async function request<T>(path: string, options: Record<string, any> = {}) {
    try {
      return await $fetch<T>(path, {
        baseURL: resolveApiBase(config.public.apiBase),
        ...options,
        headers: {
          ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}),
          ...options.headers
        }
      })
    } catch (error: any) {
      if (error?.statusCode === 401) {
        token.value = null
        if (import.meta.client) await navigateTo('/login')
      }
      throw error
    }
  }

  return {
    get: <T>(path: string, query?: Record<string, unknown>) =>
      request<T>(path, { method: 'GET', query }),
    post: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
      request<T>(path, { method: 'POST', body, headers }),
    patch: <T>(path: string, body?: unknown) =>
      request<T>(path, { method: 'PATCH', body }),
    put: <T>(path: string, body?: unknown) =>
      request<T>(path, { method: 'PUT', body }),
    delete: <T>(path: string) =>
      request<T>(path, { method: 'DELETE' })
  }
}
