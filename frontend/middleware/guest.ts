export default defineNuxtRouteMiddleware(() => {
  const token = useCookie<string | null>('oil-service-token')
  if (token.value) return navigateTo('/')
})
