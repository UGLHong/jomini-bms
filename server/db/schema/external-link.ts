import { index, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

export const externalLinkTable = pgTable(
  'external_link',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    externalId: varchar('external_id', { length: 12 }).notNull().unique(),
    userId: varchar('user_id', { length: 128 }).notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    responsePath: text('response_path').notNull().default(''),
    orderId: varchar('order_id', { length: 12 }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  },
  (t) => [
    index('external_link_external_id_idx').on(t.externalId),
    index('external_link_expires_at_idx').on(t.expiresAt),
  ],
)

export type ExternalLinkRow = typeof externalLinkTable.$inferSelect
export type ExternalLinkInsert = typeof externalLinkTable.$inferInsert
