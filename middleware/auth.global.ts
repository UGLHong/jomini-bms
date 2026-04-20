const PUBLIC_ROUTES = new Set(['/login', '/accept-invite'])

function isPublicPath(path: string): boolean {
  if (PUBLIC_ROUTES.has(path)) return true
  if (path.startsWith('/external-order/')) return true
  return false
}

export default defineNuxtRouteMiddleware(async (to) => {
  if (isPublicPath(to.path)) return

  const auth = useAuthStore()
  if (!auth.ready) {
    await auth.fetchMe()
  }

  if (!auth.isAuthenticated) {
    return navigateTo(`/login?next=${encodeURIComponent(to.fullPath)}`)
  }

  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return navigateTo('/orders')
  }
})
