import { boolean, jsonb, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { gameTable } from './game'

export const supplierTable = pgTable('supplier', {
  key: text('key').primaryKey(),
  name: text('name').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  relayChannel: text('relay_channel'),
  telegramGroupId: text('telegram_group_id'),
  telegramMentions: jsonb('telegram_mentions').$type<string[]>().default([]),
  notes: text('notes'),
  apiConfig: jsonb('api_config').$type<SupplierApiConfig>().default({ kind: 'none' }),
  apiKey: text('api_key'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type SupplierApiKind = 'none' | 'quinngamingshop'

export type SupplierApiConfig = {
  kind: SupplierApiKind
  baseUrl?: string
  autoSubmit?: boolean
  defaultContact?: string
}

export const supplierRelations = relations(supplierTable, ({ many }) => ({
  supplierGames: many(supplierGameTable),
}))

export const supplierGameTable = pgTable(
  'supplier_game',
  {
    supplierKey: text('supplier_key')
      .notNull()
      .references(() => supplierTable.key, { onDelete: 'cascade' }),
    gameKey: text('game_key')
      .notNull()
      .references(() => gameTable.key, { onDelete: 'cascade' }),
    enabled: boolean('enabled').notNull().default(true),
    isDefault: boolean('is_default').notNull().default(false),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  },
  (t) => [primaryKey({ columns: [t.supplierKey, t.gameKey] })],
)

export const supplierGameRelations = relations(supplierGameTable, ({ one }) => ({
  supplier: one(supplierTable, {
    fields: [supplierGameTable.supplierKey],
    references: [supplierTable.key],
  }),
  game: one(gameTable, {
    fields: [supplierGameTable.gameKey],
    references: [gameTable.key],
  }),
}))

export type SupplierRow = typeof supplierTable.$inferSelect
export type SupplierInsert = typeof supplierTable.$inferInsert
export type SupplierGameRow = typeof supplierGameTable.$inferSelect
export type SupplierGameInsert = typeof supplierGameTable.$inferInsert

export type SupplierGameMetadata = {
  splitStrategy?: 'greedy_largest_first' | 'fewest_splits' | 'min_cost'
}
