import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { orderTable } from './order'
import { supplierTable } from './supplier'
import { productTable } from './product'

export type SupplierSubmissionStatus =
  | 'pending'
  | 'processing'
  | 'success'
  | 'cancel'
  | 'refund'
  | 'error'

export const supplierSubmissionTable = pgTable(
  'supplier_submission',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: text('order_id')
      .notNull()
      .references(() => orderTable.id, { onDelete: 'cascade' }),
    supplierKey: text('supplier_key')
      .notNull()
      .references(() => supplierTable.key, { onDelete: 'restrict' }),
    productId: uuid('product_id').references(() => productTable.id, { onDelete: 'set null' }),
    idtrx: text('idtrx').notNull(),
    serviceId: text('service_id').notNull(),
    target: text('target').notNull(),
    contact: text('contact').notNull().default(''),
    externalInvoice: text('external_invoice'),
    status: text('status').$type<SupplierSubmissionStatus>().notNull().default('pending'),
    attempts: jsonb('attempts').$type<SupplierSubmissionAttempt[]>().notNull().default([]),
    request: jsonb('request').$type<Record<string, unknown>>().notNull().default({}),
    lastResponse: jsonb('last_response').$type<Record<string, unknown>>().default({}),
    lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('supplier_submission_idtrx_idx').on(t.supplierKey, t.idtrx),
    index('supplier_submission_order_idx').on(t.orderId),
    index('supplier_submission_status_idx').on(t.status),
  ],
)

export const supplierSubmissionRelations = relations(supplierSubmissionTable, ({ one }) => ({
  order: one(orderTable, {
    fields: [supplierSubmissionTable.orderId],
    references: [orderTable.id],
  }),
  supplier: one(supplierTable, {
    fields: [supplierSubmissionTable.supplierKey],
    references: [supplierTable.key],
  }),
  product: one(productTable, {
    fields: [supplierSubmissionTable.productId],
    references: [productTable.id],
  }),
}))

export type SupplierSubmissionAttempt = {
  at: string
  kind: 'submit' | 'status'
  ok: boolean
  message?: string
}

export type SupplierSubmissionRow = typeof supplierSubmissionTable.$inferSelect
export type SupplierSubmissionInsert = typeof supplierSubmissionTable.$inferInsert
