import { boolean, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { supplierGameTable } from './supplier'
import { productTable } from './product'
import { stockTable } from './stock'

export const gameTable = pgTable('game', {
  key: text('key').primaryKey(),
  name: text('name').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  iconUrl: text('icon_url'),
  gameIdFormat: jsonb('game_id_format').notNull().default({}),
  currencyLabel: text('currency_label').notNull().default('Diamonds'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const gameRelations = relations(gameTable, ({ many }) => ({
  supplierGames: many(supplierGameTable),
  products: many(productTable),
  stock: many(stockTable),
}))

export type GameRow = typeof gameTable.$inferSelect
export type GameInsert = typeof gameTable.$inferInsert

export type GameIdFormat = {
  regex?: string
  example?: string
  placeholder?: string
  currencyIcon?: string
  splitPattern?: string
}
