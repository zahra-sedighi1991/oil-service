export default defineNuxtRouteMiddleware(() => {
  const user = useState<{ role?: string } | null>('auth-user')
  if (import.meta.client && !user.value) {
    const stored = localStorage.getItem('oil-service-user')
    if (stored) {
      try { user.value = JSON.parse(stored) } catch {}
    }
  }
  if (user.value && user.value.role !== 'super_admin') return navigateTo('/dashboard')
})
