import { boolean, index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

export type UserRole = 'admin' | 'operator'
export type UserStatus = 'invited' | 'active' | 'disabled'

export const userTable = pgTable(
  'user',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    displayName: text('display_name').notNull().default(''),
    role: text('role').$type<UserRole>().notNull().default('operator'),
    status: text('status').$type<UserStatus>().notNull().default('invited'),
    passwordHash: text('password_hash'),
    inviteToken: text('invite_token'),
    inviteExpiresAt: timestamp('invite_expires_at', { withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
  },
  (t) => [
    index('user_email_idx').on(t.email),
    index('user_status_idx').on(t.status),
  ],
)

export const refreshTokenTable = pgTable(
  'refresh_token',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => userTable.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    userAgent: text('user_agent').notNull().default(''),
    ipAddress: varchar('ip_address', { length: 64 }).notNull().default(''),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    replacedByTokenHash: text('replaced_by_token_hash'),
    revoked: boolean('revoked').notNull().default(false),
  },
  (t) => [
    index('refresh_token_user_idx').on(t.userId),
    index('refresh_token_hash_idx').on(t.tokenHash),
  ],
)

export type UserRow = typeof userTable.$inferSelect
export type UserInsert = typeof userTable.$inferInsert
export type RefreshTokenRow = typeof refreshTokenTable.$inferSelect
export type RefreshTokenInsert = typeof refreshTokenTable.$inferInsert
