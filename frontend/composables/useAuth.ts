import type { AuthResponse, AuthUser } from '~/types/api'

export function useAuth() {
  const token = useCookie<string | null>('oil-service-token', {
    sameSite: 'lax',
    maxAge: 60 * 60 * 12
  })
  const user = useState<AuthUser | null>('auth-user', () => null)

  const isAuthenticated = computed(() => Boolean(token.value))
  const isAdmin = computed(() => user.value?.role === 'super_admin')

  function setSession(response: AuthResponse) {
    token.value = response.accessToken
    user.value = response.user
    if (import.meta.client) localStorage.setItem('oil-service-user', JSON.stringify(response.user))
  }

  function restoreUser() {
    if (!import.meta.client || user.value) return
    const stored = localStorage.getItem('oil-service-user')
    if (stored) {
      try {
        user.value = JSON.parse(stored)
      } catch {
        localStorage.removeItem('oil-service-user')
      }
    }
  }

  async function logout() {
    token.value = null
    user.value = null
    if (import.meta.client) localStorage.removeItem('oil-service-user')
    await navigateTo('/login')
  }

  return { token, user, isAuthenticated, isAdmin, setSession, restoreUser, logout }
}
