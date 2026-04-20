import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const configTable = pgTable('config', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text('updated_by'),
})

export type ConfigRow = typeof configTable.$inferSelect
export type ConfigInsert = typeof configTable.$inferInsert
