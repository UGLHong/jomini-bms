import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { gameTable } from './game'
import { supplierTable } from './supplier'

export const productTable = pgTable(
  'product',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gameKey: text('game_key')
      .notNull()
      .references(() => gameTable.key, { onDelete: 'restrict' }),
    supplierKey: text('supplier_key')
      .notNull()
      .references(() => supplierTable.key, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    amount: numeric('amount', { precision: 18, scale: 4 }).notNull(),
    combination: text('combination').notNull().default(''),
    isBaseAmount: boolean('is_base_amount').notNull().default(true),
    cost: numeric('cost', { precision: 12, scale: 4 }).notNull().default('0'),
    selling: numeric('selling', { precision: 12, scale: 4 }).notNull().default('0'),
    status: text('status').notNull().default('active'),
    sortOrder: integer('sort_order').notNull().default(0),
    metadata: jsonb('metadata').$type<ProductMetadata>().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('product_unique_idx').on(t.gameKey, t.supplierKey, t.name, t.amount),
  ],
)

export const productRelations = relations(productTable, ({ one }) => ({
  game: one(gameTable, {
    fields: [productTable.gameKey],
    references: [gameTable.key],
  }),
  supplier: one(supplierTable, {
    fields: [productTable.supplierKey],
    references: [supplierTable.key],
  }),
}))

export type ProductRow = typeof productTable.$inferSelect
export type ProductInsert = typeof productTable.$inferInsert

export type ProductMetadata = {
  splitOverride?: Record<string, string>
  bonusOnly?: boolean
  promo?: boolean
  notes?: string
  supplierServiceId?: string
}
