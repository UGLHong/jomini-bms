import { listLinks } from '@/server/services/external/linkService'
import { requireUser } from '@/server/utils/auth-guard'

export default defineEventHandler(async (event) => {
  requireUser(event)
  const links = await listLinks()
  return { links }
})
