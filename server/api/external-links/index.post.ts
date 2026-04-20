import { z } from 'zod'
import { createExternalLink } from '@/server/services/external/linkService'
import { requireUser } from '@/server/utils/auth-guard'
import { badRequest } from '@/server/utils/errors'

const bodySchema = z.object({
  userId: z.string().max(128).optional(),
  responsePath: z.string().max(200).optional(),
  expiresInHours: z.number().int().min(1).max(24 * 30).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export default defineEventHandler(async (event) => {
  requireUser(event)
  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) throw badRequest('Invalid external link request')

  const link = await createExternalLink(parsed.data)
  return { link }
})
