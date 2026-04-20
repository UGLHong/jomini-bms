import { and, eq, gt, isNull } from 'drizzle-orm'
import { useDb } from '@/server/db/client'
import { externalLinkTable, type ExternalLinkRow } from '@/server/db/schema'
import { newExternalId } from '@/server/utils/ids'

export type CreateLinkInput = {
  userId?: string
  responsePath?: string
  expiresInHours?: number
  metadata?: Record<string, unknown>
}

export async function createExternalLink(input: CreateLinkInput): Promise<ExternalLinkRow> {
  const db = useDb()
  const hours = input.expiresInHours ?? 24
  const now = new Date()
  const expiresAt = new Date(now.getTime() + hours * 60 * 60 * 1000)
  const externalId = newExternalId()

  const [row] = await db
    .insert(externalLinkTable)
    .values({
      externalId,
      userId: input.userId ?? '',
      responsePath: input.responsePath ?? '',
      expiresAt,
      metadata: input.metadata ?? {},
    })
    .returning()
  if (!row) throw new Error('Failed to create external link')
  return row
}

export async function loadActiveLink(externalId: string): Promise<ExternalLinkRow | null> {
  const db = useDb()
  const now = new Date()
  const [row] = await db
    .select()
    .from(externalLinkTable)
    .where(
      and(
        eq(externalLinkTable.externalId, externalId),
        gt(externalLinkTable.expiresAt, now),
        isNull(externalLinkTable.consumedAt),
      ),
    )
    .limit(1)
  return row ?? null
}

export async function consumeLink(externalId: string, orderId: string): Promise<void> {
  const db = useDb()
  await db
    .update(externalLinkTable)
    .set({ consumedAt: new Date(), orderId })
    .where(eq(externalLinkTable.externalId, externalId))
}

export async function listLinks(limit = 100): Promise<ExternalLinkRow[]> {
  const db = useDb()
  return db.select().from(externalLinkTable).orderBy(externalLinkTable.createdAt).limit(limit)
}
