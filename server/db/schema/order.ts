import {
  bigint,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'
import { gameTable } from './game'
import { supplierTable } from './supplier'

export type ProcessStatus =
  | 'open'
  | 'processing'
  | 'done'
  | 'error'
  | 'closed'
  | 'refund'

export type ProcessCombination = {
  amount: number
  combinationString?: string
  resolvedAt?: string
  productId?: string
}

export type ProcessFailure = {
  amount: number
  reason: string
  at?: string
}

export const orderTable = pgTable(
  'order',
  {
    id: varchar('id', { length: 12 }).primaryKey(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    doneAt: timestamp('done_at', { withTimezone: true }),
    processAt: timestamp('process_at', { withTimezone: true }),
    userId: varchar('user_id', { length: 128 }).notNull().default(''),
    ign: text('ign').notNull().default(''),
    fullname: text('fullname').notNull().default(''),
    gender: text('gender').notNull().default(''),
    phone: text('phone').notNull().default(''),
    email: text('email').notNull().default(''),
    gameKey: text('game_key')
      .notNull()
      .references(() => gameTable.key, { onDelete: 'restrict' }),
    gameId: text('game_id').notNull().default(''),
    buyAmount: numeric('buy_amount', { precision: 18, scale: 4 }).notNull().default('0'),
    paidAmount: numeric('paid_amount', { precision: 12, scale: 4 }).notNull().default('0'),
    costPrice: numeric('cost_price', { precision: 12, scale: 4 }).notNull().default('0'),
    profit: numeric('profit', { precision: 12, scale: 4 }).notNull().default('0'),
    receiptUrl: text('receipt_url').notNull().default(''),
    processSuccessful: jsonb('process_successful')
      .$type<ProcessCombination[]>()
      .notNull()
      .default([]),
    processPending: jsonb('process_pending').$type<ProcessCombination[]>().notNull().default([]),
    processFailed: jsonb('process_failed').$type<ProcessFailure[]>().notNull().default([]),
    processStatus: text('process_status').$type<ProcessStatus>().notNull().default('open'),
    supplierKey: text('supplier_key')
      .notNull()
      .references(() => supplierTable.key, { onDelete: 'restrict' }),
    lastProcessBy: jsonb('last_process_by')
      .$type<{ id: string; name: string } | null>()
      .default(null),
    processMethod: text('process_method').notNull().default(''),
    remark: text('remark').notNull().default(''),
    source: text('source').notNull().default(''),
    amountCombinationString: text('amount_combination_string').notNull().default(''),
    responsePath: text('response_path').notNull().default(''),
    telegramOrderMsgId: text('telegram_order_msg_id').notNull().default(''),
    channel: text('channel').notNull().default('web'),
    language: text('language').notNull().default('Bahasa Melayu'),
    prevOrderCount: bigint('prev_order_count', { mode: 'number' }).notNull().default(0),
    prevOrderIdCount: bigint('prev_order_id_count', { mode: 'number' }).notNull().default(0),
  },
  (t) => [
    index('order_process_status_idx').on(t.processStatus),
    index('order_created_at_idx').on(t.createdAt),
    index('order_game_supplier_idx').on(t.gameKey, t.supplierKey),
    index('order_fullname_idx').on(t.fullname),
    index('order_game_id_idx').on(t.gameId),
    index('order_response_path_idx').on(t.responsePath),
  ],
)

export type OrderRow = typeof orderTable.$inferSelect
export type OrderInsert = typeof orderTable.$inferInsert
