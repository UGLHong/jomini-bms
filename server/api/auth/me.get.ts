import { loadUser } from '@/server/services/auth/session'
import { unauthorized } from '@/server/utils/errors'

export default defineEventHandler(async (event) => {
  const sessionUser = event.context.auth?.user
  if (!sessionUser) throw unauthorized('Not signed in')

  const user = await loadUser(sessionUser.id)
  if (!user) throw unauthorized('Session no longer valid')

  return { user }
})
