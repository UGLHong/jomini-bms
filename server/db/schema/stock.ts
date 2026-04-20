import { boolean, integer, jsonb, numeric, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { gameTable } from './game'

export const stockTable = pgTable('stock', {
  gameKey: text('game_key')
    .primaryKey()
    .references(() => gameTable.key, { onDelete: 'cascade' }),
  remainingStock: numeric('remaining_stock', { precision: 18, scale: 4 }).notNull().default('0'),
  outOfStockThreshold: integer('out_of_stock_threshold').notNull().default(0),
  stockAvailable: boolean('stock_available').notNull().default(true),
  restockAt: timestamp('restock_at', { withTimezone: true }),
  custom: jsonb('custom').$type<Record<string, unknown>>().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type StockRow = typeof stockTable.$inferSelect
export type StockInsert = typeof stockTable.$inferInsert
