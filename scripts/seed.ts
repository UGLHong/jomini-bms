import 'dotenv/config'
import { fileURLToPath } from 'node:url'
import argon2 from 'argon2'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq, sql } from 'drizzle-orm'
import { Pool } from 'pg'
import {
  configTable,
  gameTable,
  productTable,
  stockTable,
  supplierGameTable,
  supplierTable,
  userTable,
} from '../server/db/schema'

const seedGames = [
  {
    key: 'mlbb',
    name: 'Mobile Legends: Bang Bang',
    currencyLabel: 'Diamonds',
    sortOrder: 10,
    gameIdFormat: {
      regex: '^[0-9]{6,12}\\s[0-9]{3,6}$',
      example: '123456789 1234',
      placeholder: 'User ID<space>Server ID',
    },
  },
  {
    key: 'pubg',
    name: 'PUBG Mobile',
    currencyLabel: 'UC',
    sortOrder: 20,
    gameIdFormat: {
      regex: '^[0-9]{8,12}$',
      example: '5123456789',
      placeholder: 'Player ID',
    },
  },
  {
    key: 'freefire',
    name: 'Free Fire',
    currencyLabel: 'Diamonds',
    sortOrder: 30,
    gameIdFormat: {
      regex: '^[0-9]{8,12}$',
      example: '123456789',
      placeholder: 'Player ID',
    },
  },
]

const seedSuppliers = [
  { key: 'smile', name: 'Smile.one', relayChannel: 'telegram', telegramMentions: ['@smile-team'] },
  { key: 'bsg', name: 'Backstreet Gamer', relayChannel: 'telegram', telegramMentions: ['@bsg-ops'] },
  { key: 'nick', name: 'Nick', relayChannel: 'telegram', telegramMentions: ['@nick-ops'] },
]

const supplierGames = [
  { supplierKey: 'smile', gameKey: 'mlbb', isDefault: true },
  { supplierKey: 'smile', gameKey: 'pubg', isDefault: false },
  { supplierKey: 'bsg', gameKey: 'mlbb', isDefault: false },
  { supplierKey: 'bsg', gameKey: 'freefire', isDefault: true },
  { supplierKey: 'nick', gameKey: 'mlbb', isDefault: false },
]

const seedMlbbDenoms = [
  { name: 'Weekly Pass', amount: 'weekly', cost: 10.5, selling: 12, isBaseAmount: false, combination: 'weekly' },
  { name: '11 Diamonds', amount: '11', cost: 0.68, selling: 1 },
  { name: '22 Diamonds', amount: '22', cost: 1.36, selling: 2 },
  { name: '56 Diamonds', amount: '56', cost: 3.3, selling: 4 },
  { name: '86 Diamonds', amount: '86', cost: 4.95, selling: 6 },
  { name: '172 Diamonds', amount: '172', cost: 9.9, selling: 12 },
  { name: '257 Diamonds', amount: '257', cost: 14.85, selling: 18 },
  { name: '344 Diamonds', amount: '344', cost: 19.8, selling: 24 },
  { name: '429 Diamonds', amount: '429', cost: 24.75, selling: 30 },
  { name: '514 Diamonds', amount: '514', cost: 29.7, selling: 36 },
  { name: '706 Diamonds', amount: '706', cost: 39.6, selling: 49 },
  { name: '878 Diamonds', amount: '878', cost: 49.5, selling: 61 },
  { name: '1050 Diamonds', amount: '1050', cost: 59.4, selling: 73 },
  { name: '1412 Diamonds', amount: '1412', cost: 79.2, selling: 97 },
  { name: '1755 Diamonds', amount: '1755', cost: 99, selling: 121 },
  { name: '2195 Diamonds', amount: '2195', cost: 123.75, selling: 150 },
  { name: '2901 Diamonds', amount: '2901', cost: 163.35, selling: 199 },
  { name: '3688 Diamonds', amount: '3688', cost: 207.9, selling: 249 },
  { name: '5532 Diamonds', amount: '5532', cost: 311.85, selling: 369 },
  { name: '9288 Diamonds', amount: '9288', cost: 519.75, selling: 610 },
]

type Db = ReturnType<typeof drizzle>

async function upsertGames(db: Db) {
  for (const game of seedGames) {
    await db
      .insert(gameTable)
      .values({
        key: game.key,
        name: game.name,
        currencyLabel: game.currencyLabel,
        sortOrder: game.sortOrder,
        gameIdFormat: game.gameIdFormat,
      })
      .onConflictDoUpdate({
        target: gameTable.key,
        set: {
          name: game.name,
          currencyLabel: game.currencyLabel,
          sortOrder: game.sortOrder,
          gameIdFormat: game.gameIdFormat,
          updatedAt: sql`now()`,
        },
      })
    await db
      .insert(stockTable)
      .values({ gameKey: game.key, remainingStock: '0', stockAvailable: true })
      .onConflictDoNothing()
  }
}

async function upsertSuppliers(db: Db) {
  for (const supplier of seedSuppliers) {
    await db
      .insert(supplierTable)
      .values({
        key: supplier.key,
        name: supplier.name,
        relayChannel: supplier.relayChannel,
        telegramMentions: supplier.telegramMentions,
      })
      .onConflictDoUpdate({
        target: supplierTable.key,
        set: {
          name: supplier.name,
          relayChannel: supplier.relayChannel,
          telegramMentions: supplier.telegramMentions,
          updatedAt: sql`now()`,
        },
      })
  }

  for (const mapping of supplierGames) {
    await db
      .insert(supplierGameTable)
      .values(mapping)
      .onConflictDoUpdate({
        target: [supplierGameTable.supplierKey, supplierGameTable.gameKey],
        set: { isDefault: mapping.isDefault },
      })
  }
}

async function upsertMlbbProducts(db: Db) {
  for (const denom of seedMlbbDenoms) {
    await db
      .insert(productTable)
      .values({
        gameKey: 'mlbb',
        supplierKey: 'smile',
        name: denom.name,
        amount: denom.amount,
        combination: denom.combination ?? '',
        isBaseAmount: denom.isBaseAmount ?? true,
        cost: String(denom.cost),
        selling: String(denom.selling),
      })
      .onConflictDoNothing()
  }
}

async function upsertSeedConfig(db: Db) {
  await db
    .insert(configTable)
    .values({
      key: 'payment_announcement',
      value: {
        title: 'Payment instructions',
        bodyMarkdown:
          'Transfer to Maybank **1234 5678 9012** (Jomini Gaming).\n\nInclude your order ID in the reference.',
        updatedAt: new Date().toISOString(),
      },
    })
    .onConflictDoNothing()
}

async function upsertFirstAdmin(db: Db, log: (msg: string) => void) {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD

  if (!email || !password) {
    log('[seed] SEED_ADMIN_EMAIL/PASSWORD not set; skipping first-admin seed')
    return
  }

  const [existing] = await db.select().from(userTable).where(eq(userTable.email, email)).limit(1)
  if (existing) {
    log(`[seed] admin ${email} already exists, skipping`)
    return
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 64 * 1024,
    timeCost: 3,
    parallelism: 1,
  })

  await db.insert(userTable).values({
    email,
    displayName: 'Owner',
    role: 'admin',
    status: 'active',
    passwordHash,
  })
  log(`[seed] created admin ${email}`)
}

export async function runSeed(
  pool: Pool,
  log: (msg: string) => void = (msg) => console.log(msg),
): Promise<void> {
  const db = drizzle(pool)
  log('[seed] seeding database...')
  await upsertGames(db)
  await upsertSuppliers(db)
  await upsertMlbbProducts(db)
  await upsertSeedConfig(db)
  await upsertFirstAdmin(db, log)
  log('[seed] done.')
}

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is required')
  const pool = new Pool({
    connectionString: url,
    ssl: url.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
  })
  try {
    await runSeed(pool)
  } finally {
    await pool.end()
  }
}

const selfUrl = typeof import.meta.url === 'string' ? import.meta.url : ''
const invokedDirectly = selfUrl !== '' && process.argv[1] === fileURLToPath(selfUrl)
if (invokedDirectly) {
  main().catch((err) => {
    console.error('[seed] failed', err)
    process.exit(1)
  })
}
