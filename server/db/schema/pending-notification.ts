import { index, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

export type PendingNotificationKind = 'write_review' | 'daily_summary_internal' | 'daily_summary_supplier'
export type PendingNotificationStatus = 'pending' | 'sent' | 'failed'

export const pendingNotificationTable = pgTable(
  'pending_notification',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kind: text('kind').$type<PendingNotificationKind>().notNull(),
    orderId: varchar('order_id', { length: 12 }),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    status: text('status').$type<PendingNotificationStatus>().notNull().default('pending'),
    lastError: text('last_error'),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('pending_notification_due_idx').on(t.status, t.scheduledAt),
    index('pending_notification_order_idx').on(t.orderId),
  ],
)

export type PendingNotificationRow = typeof pendingNotificationTable.$inferSelect
export type PendingNotificationInsert = typeof pendingNotificationTable.$inferInsert
