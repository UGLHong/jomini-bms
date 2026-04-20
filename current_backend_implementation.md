# Jomini Enterprise — Current Backend Implementation

> This document is a reference snapshot of the **existing** Jomini Enterprise backend. It is intended to be handed to an AI together with the frontend documentation so that an implementation plan for a fresh (v2) application can be produced.
>
> Everything below describes what is *currently* running in production; do not treat it as the desired end-state.

---

## ⚠️ CRITICAL — Externally Consumed APIs (MUST NOT CHANGE)

Two endpoints are called externally by an automation platform (FlowXO) that we do not control. They are still in active use by the existing chatbot funnel, therefore **their URL path, HTTP method, request shape, and response shape must be preserved byte-for-byte** in the new application. Internal implementation (database, services, auth, etc.) can be changed freely, but the external contract must stay identical so that FlowXO bots keep working without reconfiguration.

### 1. `POST /order/create` — Create an order

Production URL: `https://jomini-enterprise.et.r.appspot.com/order/create`

Headers:

| Header | Value |
| --- | --- |
| `Content-Type` | `application/json` |
| `CustomAuth` | The shared webhook token (currently `MANYCHAT_WEBHOOK_TOKEN` in `.env`: `hE7Dujd"%5E'0Wl~'zl9#0ex#|$D10daad9{>1;b:X=c1qUtc4DuYsgFd{cFjj6`) |

JSON body (every field shown is sent by FlowXO — field presence, names, and types must remain identical):

| Field | Type | Notes |
| --- | --- | --- |
| `fullname` | string | `{{new_message.user_first_name}} {{new_message.user_last_name}}` |
| `userId` | string | FlowXO's `new_message.user_id`, auto-coerced to string |
| `responsePath` | string | FlowXO callback path, used to reply to the user |
| `gender` | string | `{{new_message.user_gender}}` |
| `phone` | string | optional |
| `email` | string | may be empty |
| `game` | string | lowercase enum value, see `Game` enum below |
| `gameId` | string | raw game ID (e.g. `"123456789 1234"` for MLBB) |
| `buyAmount` | string | numeric string; parsed with `val.match(/[.\d]+/)` → float |
| `paidAmount` | string | numeric string; parsed the same way |
| `receiptUrl` | string | URL of uploaded receipt screenshot |
| `source` | string | e.g. `flowxo_bot`, `manychat_bot`, `jg_internal_web` |
| `channel` | string | `web`, `messenger`, `telegram`, `whatsapp` |
| `language` | string | default `"Bahasa Melayu"`, alternate `"English"` |
| `supplier` | string | optional, see `Supplier` enum below |

Response (example — do not change shape):

```json
{
  "status": "success",
  "message": "",
  "data": { /* the created OrderEntity object */ }
}
```

On validation failure a 400 with `{ message, errors }` is returned by `express-validator`. Existing clients tolerate this.

### 2. `GET /stock_status?game=<game>` — Stock check

Production URL: `https://jomini-enterprise.et.r.appspot.com/stock_status?game=mlbb`

Headers: `CustomAuth` (same token as above).

Response (must stay identical in shape):

```json
{
  "status": "success",
  "data": {
    "id": "...",
    "game": "mlbb",
    "remainingStock": 12345,
    "outOfStockThreshold": 0,
    "stockAvailable": true,
    "restockAt": "2024-01-01T00:00:00.000Z",
    "custom": {},
    "restockAtString": "1/1/2024, 8:00:00 AM",
    "outOfStock": false,
    "currentDateTime": "1/1/2024, 8:00:00 AM",
    "stockMessage": "👍🏼 Stock available"
  }
}
```

If no record is found, returns HTTP 404 `{ "message": "Status not found" }`.

The new implementation **must** keep:

- the same path (`/order/create`, `/stock_status`)
- the same HTTP methods (`POST`, `GET`)
- the same query/body field names and types
- the same response envelope (`{ status, data, message }`) and inner field names
- acceptance of the `CustomAuth` header as the sole credential for these two calls

---

## 1. Overview

Jomini Enterprise is an **internal admin backend** powering a Malaysian game-top-up business (Jomini Gaming). It sells in-game currency (MLBB diamonds, PUBG UC, Free Fire diamonds, Wild Rift wild cores, Genshin Impact genesis crystals, Honor of Kings tokens) through several sales channels (Facebook Messenger via Manychat, Telegram/WhatsApp via FlowXO, and an internal web dashboard).

Core responsibilities:

1. Receive orders from chatbot flows (FlowXO, Manychat) and the internal web admin.
2. Validate each order (check game ID against vendor APIs, compute cost/profit, split amount into supported denominations).
3. Dispatch the order to a supplier (Smile.one API, Backstreet Gamer / Nick via Telegram, or manual).
4. Track the order lifecycle (open → processing → done / error / closed / refund) and notify the customer and internal Telegram groups at each step.
5. Maintain a Google Sheets ledger (historical "Income2020" sheet + per-game tabs) for bookkeeping.
6. Broadcast daily sales summaries per game and per supplier to Telegram.
7. Provide a Billplz payment-gateway webhook for optional online payment.
8. Provide a Telegram bot webhook that lets suppliers mark orders done/fail via `/d <orderId>` and `/f <orderId> <reason>` chat commands.

The app is deployed to **Google App Engine Standard** (`nodejs20`, single F1 instance, `app.yaml`) at `https://jomini-enterprise.et.r.appspot.com/`. A separate **home-hosted "puppeteer server"** (reachable at `http://jomini-enterprise.tplinkdns.com:3456`, env `HOME_SERVER_IP`) is used for browser automation tasks that App Engine cannot run (Smile.one login scraping, Maybank2U bank-statement screenshots, BSG session cookies).

---

## 2. Tech stack

| Layer | Technology |
| --- | --- |
| Language | TypeScript 5.4 (compiled to CommonJS ES6) |
| Runtime | Node.js 20 |
| Web framework | Express 4.19 |
| Hosting | Google App Engine Standard (`gcloud app deploy`) |
| Relational DB | PostgreSQL (DigitalOcean managed, SSL enabled) via TypeORM 0.3 |
| ORM naming | `typeorm-naming-strategies` → `SnakeNamingStrategy` |
| Realtime / NoSQL | Google Firebase — Firestore (live order data) + Firebase Auth + Firebase Storage (receipt uploads) |
| Spreadsheets | Google Sheets API v4 via OAuth2 (`google-sheets-api-credentials.json` + `token.json`) |
| Auth on API | Firebase ID tokens verified per request; or `CustomAuth` header matching `MANYCHAT_WEBHOOK_TOKEN` |
| Payments | Billplz (Malaysia) — FPX / credit card |
| Notifications | Telegram Bot API (HTTP), Manychat API, FlowXO HTTP hook |
| Validation | `express-validator` 6 |
| Logging | Morgan + a custom request logger (`modules/logger.ts`) using `chalk` |
| In-memory dedupe store | `modules/persistent-store.ts` (plain object) |
| Dates | `dayjs` with `utc` + `timezone` plugins (default `Asia/Kuala_Lumpur`) |
| HTTP client | `axios` 1 |
| IDs | `shortid` for entity PKs, `nanoid` for request log IDs |
| File upload | `formidable` 1 (multipart) |
| Sanitization | `xss` for nicknames returned by 3rd-party APIs |
| Dev tooling | `nodemon`, `ts-node`, `husky` + `lint-staged`, ESLint, Prettier |

### TypeScript path aliases (`tsconfig.json`)

```
@modules/*   -> modules/*
@utils/*     -> utils/*
@database    -> database
@database/*  -> database/*
@routes      -> routes
@routes/*    -> routes/*
@helper      -> utils
@helper/*    -> utils/*
@type        -> type
~/*          -> *
```

---

## 3. Project layout

```
.
├── app.ts                     express app, middleware, DB+GSheets+Firebase bootstrap
├── entry.ts                   HTTP server bootstrap (normalizePort, listen)
├── app.yaml                   GAE config (nodejs20, F1, min/max=1 instance)
├── tsconfig.json              path aliases
├── nodemon.json               dev watcher
├── .env / .env.dev            environment (see §7)
├── google-sheets-api-credentials.json
├── jomini-enterprise-firebase-adminsdk-credentials.json
├── token.json                 Google OAuth refresh token (persisted)
├── ormconfig.json             legacy TypeORM CLI config (old credentials)
├── database/
│   ├── data-source.ts         TypeORM DataSource (postgres, snake naming)
│   ├── index.ts               initializeDatabase() / getDataSource()
│   ├── entity/                order, product, external-link, stock, config, user
│   ├── repository/            thin wrappers + ProductRepository with priceMap/denomMap helpers
│   ├── migration/             11 TypeORM migrations (2023-2024)
│   └── seed.ts                seed script
├── modules/
│   ├── backstreet-gamer.ts    BSG supplier integration (Telegram + legacy HTTP)
│   ├── billplz.ts             Billplz bills, collections, FPX banks
│   ├── dayjs.ts               dayjs preconfigured for Asia/Kuala_Lumpur
│   ├── firebase.ts            firebase-admin init (Firestore, Storage, Auth)
│   ├── flowxo.ts              sendMessage / sendAnnouncement via FlowXO webhook
│   ├── google-sheets.ts       OAuth, range read/write, per-game ledger writers
│   ├── logger.ts              custom express request/response logger
│   ├── manychat.ts            sendFlow / sendContent via Manychat REST API
│   ├── notify.ts              per-scenario customer notification dispatcher
│   ├── persistent-store.ts    in-memory dedupe (process-local)
│   ├── request-validator.ts   validateReq() / filterReqBody()
│   └── telegram.ts            all Telegram group messages + supplier ordering
├── routes/
│   ├── index.ts               CORS + firebase auth middleware + auto-register *.ts
│   ├── order.ts               create / create_external / process / reject / done / update / archive / url
│   ├── config.ts              stock_status, payment_announcement, smile_one_config
│   ├── report.ts              daily_sales_update(_supplier), today_profit, detailed_order_history, smile_one_history
│   ├── user.ts                /user/me (Firebase-auth-backed)
│   └── webhook.ts             /webhook/telegram_bot/update, /webhook/billplz/payment_callback, /webhook/test
├── script/
│   ├── cleanup-game-id.ts     one-off cleanup
│   ├── sync-gsheet-price-to-db.ts    Google-Sheets → products table sync
│   └── temp-script.ts         ad-hoc migration scratchpad
├── utils/
│   ├── database.ts
│   ├── file.ts                asyncRoute(), throwError(), getFilenamesInFolder()
│   ├── firebase.ts            transformFirebaseDate() for _seconds → Date
│   ├── order.ts               core order logic: extractGameId, getGameIdData, amount splitting, sendMLBBDiamondWithAPI, uploadFileToBucket
│   └── price.ts               cost/profit combination calc, daily sales statistics
├── views/                     jade (pug) — only `error.jade`, `index.jade`, `layout.jade`
├── public/                    static assets served from /
└── type.ts                    Game, Supplier, Channel, Source, Language, NotifySenario enums
```

---

## 4. Domain enums (`type.ts`)

```ts
Game:     MLBB | PUBG | WR | FF | GENSHIN_IMPACT | HOK
Supplier: SC (smile_one) | CODASHOP | BSG (backstreet_gamer) | NICK | OTHERS
Channel:  WEB | MESSENGER | TELEGRAM | WHATSAPP
Source:   MANYCHAT_BOT | FLOWXO_BOT | JOMINI_GAMING_INTERNAL_WEB
Language: "Bahasa Melayu" | "English"
NotifySenario: ORDER_REJECT | ORDER_VERIFIED | ORDER_DONE |
               ORDER_SENT_SUPPLIER | WRONG_ID | WRITE_REVIEW
```

Order `processStatus` lifecycle (string, not enum):
`open` → `processing` → `done`  /  `error` (retryable) / `closed` (rejected) / `refund`.

Order `paymentStatus` (string): `due` | `paid` | `deleted`.

---

## 5. Database schema (PostgreSQL, TypeORM, snake_case)

### `order` (primary OLTP table — all historical orders end up here)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | varchar PK | `shortId.generate()` (~9 chars) |
| `created_at` | timestamptz | `CreateDateColumn` |
| `done_at` | timestamptz? | set when status transitions to `done` |
| `process_at` | timestamptz? | set on every status transition |
| `user_id` | varchar, indexed | Manychat subscriber_id or "" |
| `ign` | text, indexed | In-Game Name fetched from Smile.one/Garena |
| `fullname` | text, indexed | |
| `gender`, `phone`, `email` | text | |
| `game` | text | `Game` enum value |
| `game_id` | varchar | raw "userId zoneId" style (regex parsed) |
| `buy_amount`, `paid_amount`, `cost_price`, `profit` | float | MYR |
| `receipt_url` | varchar | bank-transfer screenshot URL |
| `check_urls` | jsonb | array of Maybank statement screenshots |
| `process_successful` | jsonb | `ProcessCombination[]` successfully sent to supplier |
| `process_pending` | jsonb | awaiting supplier confirmation |
| `process_failed` | jsonb | per-split failures |
| `process_status` | varchar | `open` / `processing` / `done` / `error` / `closed` / `refund` |
| `supplier` | text | default `smile_one` |
| `last_process_by` | jsonb | `{ id, name }` of admin who acted |
| `process_method` | varchar | free-form |
| `remark` | varchar | |
| `source` | text | `Source` enum value |
| `invoice_id` | text | Billplz bill id, "" if none |
| `payment_status` | text | `due` / `paid` / `deleted` |
| `enable_payment_gateway` | bool | |
| `amount_combination_string` | text | e.g. `"172+172+706"` |
| `response_path` | text, indexed | FlowXO reply hook |
| `telegram_order_msg_id` | text | Telegram message id sent to BSG/NICK group |
| `channel` | text | `Channel` enum |
| `language` | text | default `Bahasa Melayu` |
| `prev_order_count` | int8 | how many prior orders from same fullname |
| `prev_order_id_count` | int8 | how many prior orders from same gameId |
| `price_modifier` | float | Smile.one region-price multiplier |

### `product` (pricing catalog; driven by `npm run sync-gsheet-price-to-db`)

Unique index on (`amount`, `game`, `supplier`, `name`).

| Column | Type |
| --- | --- |
| `id` | uuid PK |
| `name` | text (e.g. `diamond`, `unknown_cash`, `valorant_points`, or pass names) |
| `amount` | numeric (game-currency units) |
| `combination` | text (e.g. `"172+172"`) |
| `is_base_amount` | bool — included in denominator list only when true |
| `cost` | float (MYR buy-in) |
| `selling` | float (MYR sell-out) |
| `supplier` | text |
| `status` | text `active` / `inactive` |
| `game` | text |

### `stock` — one row per `game`

| Column | Type |
| --- | --- |
| `id` | shortid PK |
| `game` | text |
| `remaining_stock` | float |
| `out_of_stock_threshold` | int |
| `stock_available` | bool |
| `restock_at` | timestamptz? |
| `custom` | jsonb |

### `external_link` — tokenized public order-form links

| Column | Type | Notes |
| --- | --- | --- |
| `id` | shortid PK | used as path segment on the public web form |
| `created_at` | timestamptz | |
| `expired` | bool | |
| `access_count`, `max_access_count` | int | 0 means unlimited |
| `active_duration` | int8 ms | 0 means never expire by time |
| `user_id`, `username`, `source`, `response_path` | text | prefilled fields |
| `game`, `supplier`, `remark` | text | |
| `custom_data` | jsonb | |

### `config` — key/value JSON blobs

Keys (`Config` enum): `payment_announcement`, `smile_one_credentials`.

### `user` — internal admin users (Firebase-auth-backed)

| Column | Notes |
| --- | --- |
| `id` | Firebase UID |
| `account_type` | `supplier` / `user` / `admin` |
| `status` | `active` / `suspended` / `deleted` |
| `name`, `email`, `address` | |
| `contact_numbers`, `photos` | text[] |
| `permission` | json, e.g. `{ createVenue: false }` |

### Migrations

Run via `npm run migration:run` / `:revert` / `:create`. 11 migrations covering column casing, supplier_pending column addition, combination string, telegram message id, product table bootstrap, IGN to text, number-to-date conversions, and base-amount column on product.

---

## 6. Firestore collections

Firestore is used as the **live** mirror of active work; Postgres is the archival store. The two are kept in sync on every state-changing operation.

| Collection | Shape / purpose |
| --- | --- |
| `order` | Same shape as `OrderEntity`, but only rows that are still actionable (not yet archived). `createOrder` writes here first; `archive` / `archive_all` delete from Firestore and upsert to Postgres. Fields with `{_seconds, _nanoseconds}` are normalized via `utils/firebase.ts#transformFirebaseDate`. |
| `allowedUser` | Document id = Firebase UID. `onSnapshot` listener in `routes/index.ts` keeps an in-memory `allowedIds` list; only those UIDs can authenticate via Firebase ID token. |
| `statistic/mlbb` | Updated by `updateMLBBStatistic()` every time an order mutates; stores `{ totalSalesCount, totalIncome, totalCost, totalProfit, totalAmount, orderIds, currentPlatformCredit, BSGWalletBalance }` for today. |

---

## 7. Environment variables (`.env`)



### Production `.env`

> **SECRETS REDACTED** — Rotate any production secrets before public release.

```
DB_HOST=jomini-enterprise-db-do-user-13666021-0.b.db.ondigitalocean.com
DB_USERNAME=doadmin
DB_PASSWORD=[REDACTED]
DB_NAME=jomini-gaming
DB_PORT=25060
CORS_ALLOWED_ORIGIN=https://jominigaming.com,https://jomini-enterprise.firebaseapp.com
FRONTEND_URL=https://jominigaming.com
DB_LOGGING=false
ALLOW_UNAUTH=false
MANYCHAT_WEBHOOK_TOKEN=[REDACTED]
TELEGRAM_BOT_TOKEN=[REDACTED]
TELEGRAM_MLBB_GROUP_ID=-1001494640071
TELEGRAM_SUPPLIER_ONGBS_GROUP_ID=-1001172301079
TELEGRAM_SUPPLIER_NICK_GROUP_ID=-4663602157
TELEGRAM_BUTTON_URL=https://jominigaming.com
SMILEONE_GOOGLE_ID=jominigaming@gmail.com
SMILEONE_GOOGLE_PW=[REDACTED]
PUPPETEER_HEADLESS=true
JOMINI_BUSINESS_SPREADSHEET_ID=11l1of_pkv4a4xKKcjWSXTOyDjv3iN5tqm7654WCctB8
GS_MLBB_NAME_COL=U
GS_MLBB_ID_COL=V
```
GS_MLBB_SERVER_COL=W
GS_MLBB_AMOUNT_COL=T
GS_MLBB_SOURCE_COL=Z
GS_MLBB_REMARK_COL=S
GS_MLBB_COST_COL=L
GS_MLBB_PAID_COL=K
GS_MLBB_DATE_COL=J
GS_MLBB_COUNT_COL=I
GS_MLBB_RATE_A1=S12
GS_MLBB_RATE_COL=M
GS_MLBB_DAILY_TOTAL_COL=G
GS_MLBB_START_ROW=18
GS_MLBB_PROFIT_COL=P
MANYCHAT_API_KEY=885633514810993:5c2462ea245fb20854c6212a7b060af7
MBB_ID=ahhong1993
MBB_PASSWORD=Thlohthloh1$
MBB_BUSINESS_ID=jomini0428
MBB_BUSINESS_PASSWORD=Thlohthloh1!
FIREBASE_STORAGE_BUCKET=jomini-enterprise.appspot.com
HOME_SERVER_IP=http://jomini-enterprise.tplinkdns.com:3456
HOME_SERVER_TOKEN=11l1of_pkv4a4xKKcjWSXTOE'0Wl~'zl9#0ex#|$D10daad9{>1;b
TELEGRAM_INCOMING_WEBHOOK_TOKEN=zIFtNp3Aa5PcHcQwWcmETe1PfZEuoABA
DEBUG=false
BILLPLZ_SECRET=c7e606a1-344c-4612-ab0f-35294b6f0cdc
BILLPLZ_API_URL=https://www.billplz.com
BILLPLZ_CALLBACK_URL=https://jomini-enterprise.et.r.appspot.com
FLOWXO_CALLBACK_URL=https://flowxo.com/hooks/a/z9w7e4g5
BSG_ID=01110604283
BSG_PW=Jomini0428
BSG_USE_TELEGRAM=true
```

### Dev differences (`.env.dev`)

```
DB_HOST=pgm-zf8dd778qk732dl9to.pgsql.kualalumpur.rds.aliyuncs.com
DB_USERNAME=backend_access
DB_PASSWORD=backendaccess1!
DB_NAME=jomini-gaming
DB_PORT=5432
PORT=8080
CORS_ALLOWED_ORIGIN=http://localhost:1202
FRONTEND_URL=http://localhost:1202
PUPPETEER_HEADLESS=false
HOME_SERVER_IP=http://localhost:3456
BILLPLZ_SECRET=d82da688-817a-423c-b8d1-5c8a687bf202
BILLPLZ_API_URL=https://www.billplz-sandbox.com
BILLPLZ_CALLBACK_URL=http://jomini-enterprise.tplinkdns.com:8080
DEBUG=true
```

### What each variable is used for

- `DB_*` — Postgres connection for TypeORM (`database/data-source.ts`). SSL is forced with `rejectUnauthorized: false`.
- `CORS_ALLOWED_ORIGIN` — comma-separated allowlist; requests without `Origin` always pass (curl / mobile apps).
- `ALLOW_UNAUTH` — if `true`, requests without a valid Firebase ID token are still accepted with `req.auth = {}`.
- `MANYCHAT_WEBHOOK_TOKEN` — the `CustomAuth` header shared secret. Requests carrying this header bypass Firebase auth.
- `TELEGRAM_BOT_TOKEN` — bot token for `https://api.telegram.org/bot<token>/sendMessage` and the Telegram webhook.
- `TELEGRAM_MLBB_GROUP_ID` — internal "war room" Telegram group that receives every order event.
- `TELEGRAM_SUPPLIER_ONGBS_GROUP_ID` / `TELEGRAM_SUPPLIER_NICK_GROUP_ID` — supplier chat groups where the bot relays orders and listens for `/d` and `/f` responses.
- `TELEGRAM_BUTTON_URL` — base URL of the admin frontend; used to build an "Auto Process" inline button (e.g. `${TELEGRAM_BUTTON_URL}/auto_process?orderId=...`).
- `TELEGRAM_INCOMING_WEBHOOK_TOKEN` — token appended as `?token=` on Telegram's webhook URL; the backend rejects any other value.
- `JOMINI_BUSINESS_SPREADSHEET_ID` + `GS_MLBB_*` — Google Sheets coordinates for the MLBB "Income2020" ledger. `GS_MLBB_*_COL` are column letters; `GS_MLBB_START_ROW`, `GS_MLBB_RATE_A1` are anchors used by `generateMLBBNonOrderData`.
- `MANYCHAT_API_KEY` — bearer token for Manychat REST API (`api.manychat.com/fb/sending/sendFlow` & `sendContent`).
- `MBB_*` — legacy Maybank2U credentials (no longer used directly; the home server handles scraping).
- `SMILEONE_GOOGLE_*` — legacy Smile.one account credentials (no longer used directly; home server PHPSESSID fetch is used instead).
- `FIREBASE_STORAGE_BUCKET` — bucket for storing uploaded receipts (`order/<orderId>/*.jpeg`).
- `HOME_SERVER_IP` + `HOME_SERVER_TOKEN` — the self-hosted puppeteer sidecar (see §12).
- `BILLPLZ_*` — Billplz API base, V3 secret, and callback URL registered with Billplz.
- `FLOWXO_CALLBACK_URL` — HTTP hook used to reply to FlowXO conversations.
- `BSG_ID`, `BSG_PW`, `BSG_USE_TELEGRAM` — Backstreet Gamer credentials / mode flag. When `BSG_USE_TELEGRAM` is truthy, orders are relayed to the BSG Telegram group instead of the (commented-out) direct HTTP integration.
- `DEBUG` — extra logging in `sendMLBBDiamondWithAPI`.
- `PUPPETEER_HEADLESS` — only relevant on the home server.
- `PORT` — overrides default 3000 (GAE sets this automatically).

---

## 8. Authentication & middleware

Middleware order registered in `app.ts`:

1. `compression()`
2. `morgan('dev')`
3. `cookie-parser`
4. `express.json()`
5. `express.urlencoded({ extended: false })`
6. Firebase/DB/GSheets init (async, `Promise.all([...]).then`)
7. Custom request logger (`initLogger`)
8. `registerRoute(app)`:
   - **CORS** — dynamic origin callback, allowlist from `CORS_ALLOWED_ORIGIN`; origins with no `Origin` header always pass.
   - **Auth check** for every incoming request, with these **exceptions that bypass auth entirely**:
     - `/detailed_order_history`
     - `/daily_sales_update`
     - `/daily_sales_update_supplier`
     - `/webhook` (any)
     - `/url/verify_external`
     - `/order/create_external`
     - `/webhook/billplz/payment_callback`
   - If `req.headers.customauth === MANYCHAT_WEBHOOK_TOKEN` → pass through (used by FlowXO and Manychat).
   - Else if `req.headers.authorization` is set → `admin.auth().verifyIdToken(token, true)`. The decoded UID must exist in the Firestore `allowedUser` collection (live-synced via `onSnapshot`); otherwise HTTP 403.
   - Else if `ALLOW_UNAUTH === 'true'` → `req.auth = {}` and pass (dev only).
   - Else → HTTP 403.
9. All route files under `routes/*.ts` (except `index.ts`) auto-registered by file-name scan.
10. 404 → `http-errors` → `views/error.jade`.

Request log format (custom, ANSI-colored): `[ MM/DD h:mm:ssa | METHOD | /path ]` on entry, plus `[ ... | status | duration ms ]` on finish. Each request is tagged with a 4-char `nanoid`.

---

## 9. HTTP API inventory

All non-webhook endpoints except the two external ones require Firebase auth **or** the `CustomAuth` header.

### Orders (`routes/order.ts`)

| Method & path | Purpose |
| --- | --- |
| `POST /order/create` | **EXTERNAL** — JSON body, creates order, writes to Postgres + Firestore, kicks off async bank-statement-screenshot fetch via the home server, notifies `TELEGRAM_MLBB_GROUP_ID`. |
| `POST /order/create_external` | Multipart form (file + fields). Validates against an `external_link` token, uploads the receipt to Firebase Storage, optionally informs the Manychat subscriber, then delegates to `createOrder`. |
| `POST /order/process` | Body `{ orderId }`. Runs the split-amount / supplier-dispatch pipeline. Uses `persistent-store` to prevent duplicate concurrent processing; if already in-flight, emits a "duplicate processing detected" Telegram alert. |
| `POST /order/reject` | Marks `processStatus = 'closed'`, notifies customer (via Manychat/FlowXO) and the internal Telegram group. |
| `POST /order/archive` | Persists Firestore row to Postgres and deletes from Firestore. `open` is flipped to `closed`. |
| `POST /order/archive_all` | Same as above for every row where `processStatus != 'processing'`. |
| `POST /order/unarchive_all` | Inverse helper. |
| `POST /order/done` | Body `{ orderId, ... }` — force-mark an order done (used by manual admin UI). Writes to Google Sheets and pings customer when transitioning to done. Triggers a delayed "please review us" message if this was one of the customer's first orders. |
| `POST /order/update` | Partial update of an order. Recomputes `costPrice`/`profit` from the current product price map; resets `processFailed` if `buyAmount` or `supplier` changed. |
| `POST /url/create_external` | Creates a short-lived, max-access-limited `external_link` row and returns `${FRONTEND_URL}/external_order/<id>`. |
| `POST /url/verify_external` | Public, unauthenticated. Returns link metadata if still valid; marks expired otherwise. |
| `POST /test`, `POST /test/process` | Developer harness endpoints (not used in prod flow). |

### Config (`routes/config.ts`)

| Method & path | Purpose |
| --- | --- |
| `GET /stock_status?game=<g>` | **EXTERNAL** — returns stock row + derived `outOfStock`, `restockAtString`, `stockMessage`, `currentDateTime`. |
| `PUT /stock_status` | Upsert a stock row (admin UI). |
| `GET /payment_announcement` | Returns `{ show, message }` used by the customer-facing front page. |
| `PUT /payment_announcement` | Update it. |
| `GET /smile_one_config` / `PUT /smile_one_config` | Store/retrieve the Smile.one PHPSESSID override blob (used as a fallback when the home-server scrape fails). |

### Reports (`routes/report.ts`)

All invoked by Cloud Scheduler / cron (auth-exempt).

| Method & path | Purpose |
| --- | --- |
| `GET /daily_sales_update` | Posts per-game daily sales to the internal Telegram group. Uses yesterday-in-MYT window. |
| `GET /daily_sales_update_supplier` | Same, but to supplier groups (BSG, NICK), per-supplier. |
| `GET /today_profit` | Returns today's `getSalesStatistic` per game. |
| `GET /detailed_order_history?dayOffset=<n>` | Builds a reconciliation report of internal orders vs. Smile.one history for a given day. |
| `GET /smile_one_history?dayOffset=<n>` | Raw Smile.one `codelist` (activation-code / order-list) for the day. |

### User (`routes/user.ts`)

| Method & path | Purpose |
| --- | --- |
| `GET /user/me` | Read current Firebase-authenticated admin user. |
| `POST /user/me` | Create / upsert the admin user row. |

### Webhooks (`routes/webhook.ts`)

| Method & path | Purpose |
| --- | --- |
| `POST /webhook/telegram_bot/update?token=<token>` | Telegram Bot webhook. Matches `/d <orderId>` or `/f <orderId> <reason>` in supplier group chats. `/d` marks the order done, writes to Google Sheets, notifies customer, updates Postgres from Firestore. `/f` marks it error. Group ID is matched against `TELEGRAM_SUPPLIER_ONGBS_GROUP_ID`/`TELEGRAM_SUPPLIER_NICK_GROUP_ID` to determine the supplier. Always returns `{ status: 'successful' }` (even on error) to prevent Telegram retry duplicates. |
| `POST /webhook/billplz/payment_callback` | Billplz V3 callback. Looks up the order by `invoiceId`, flips `paymentStatus`, sends success/fail message via Manychat, then auto-invokes `processOrder(...)` internally when payment flips to `paid`. Always returns `{ status: 'successful' }`. |
| `POST /webhook/test` | Echo endpoint. |

To (re)bind the Telegram webhook:

```
curl -F "url=https://jomini-enterprise.et.r.appspot.com/webhook/telegram_bot/update?token={{TELEGRAM_INCOMING_WEBHOOK_TOKEN}}" \
  https://api.telegram.org/bot{{TELEGRAM_BOT_TOKEN}}/setWebhook
```

---

## 10. Core order pipeline

`POST /order/create` → `createOrder` (`routes/order.ts`)

1. `extractGameId(rawId, game)` — regex-split the game id into `(userId, serverId)` for MLBB / PUBG / FF / HOK; WR and Genshin store it verbatim.
2. Infer supplier if not provided: MLBB defaults to `SC`, everything else to `BSG`.
3. `getGameIdData(gameId, game)` — calls Smile.one `checkrole` + `query` endpoints (for MLBB, XSS-sanitized nickname + `priceModifier` + `flowid`) or Garena `shop.garena.my/api/auth/player_id_login` (for FF). Other games skip external validation.
4. `updateMLBBStatistic()` (async) — recomputes today's sales numbers and writes `statistic/mlbb` in Firestore + the matching `stock` row.
5. `getAmountCostCombination({ amount, game, priceModifier, supplier })` — looks up the active product price map and runs a greedy denominator split (largest denomination first). Returns `{ totalCost, balance, combinationString }`. Non-Smile.one suppliers ignore `priceModifier`.
6. Prev-order counts are computed for abuse/trust flags (`prevOrderCount` by fullname, `prevOrderIdCount` by gameId).
7. The row is saved to Postgres and mirrored to Firestore (`order/<id>`).
8. Fire-and-forget `getBankSS()` — POSTs to `HOME_SERVER_IP/puppeteer/getBankSS` to fetch a Maybank statement screenshot (+ current balance), updates `checkUrls` on the Firestore row, updates the spreadsheet business-account total, and sends `notifyOrderCreated` to Telegram.

`POST /order/process` → `processOrder` (same file)

1. `persistent-store` dedupe (per process memory). Duplicates emit a Telegram warning.
2. Read Firestore row; reject if status is not `open` / `error`, except when supplier is `SC` (which can be resent because Smile.one is idempotent enough via flowid).
3. Flip Firestore status to `processing` and set `lastProcessBy`.
4. Notify customer (`ORDER_VERIFIED`), split the amount again (denom map can change between create and process), and emit `notifyOrderProcessing` to the internal Telegram group.
5. Dispatch by supplier:
   - `SC` → `sendMLBBDiamondWithAPI(processCombination)` — loops through the splits, hits Smile.one's `checkrole`+`query`+`pay` endpoints using a PHPSESSID + CSRF token fetched from the home server's `/puppeteer/getSmileOneData`. Classifies redirects: `/message/success` = success, `/customer/recharge` = insufficient smile coins, `/message/error` = generic fail, anything else = investigate.
   - `BSG` / `NICK` → `orderOnSupplier` — when `BSG_USE_TELEGRAM` is on, delegates to `sendOrderToSupplier` which posts an @-mentioning message into the supplier Telegram group (with tap-to-copy `/d <id>` and `/f <id> write_fail_reason` commands). When off, the legacy BSG HTTP flow applies (currently commented out in the source).
   - `OTHERS` → no-op; the order stays pending manual processing.
6. Update Firestore + Postgres with `processSuccessful` / `processPending` / `processFailed`; send customer and internal notifications matching the outcome. If failure message includes "Wrong game ID", fire `WRONG_ID` customer notification.

### Splits & denominations (`utils/order.ts`, `utils/price.ts`)

- `getAmountDenominator({ game, supplier })` merges product-table base amounts with hard-coded `customDenominator` overrides (e.g. MLBB Smile.one knows `344 = 172×2`, `516 = 172×3`, etc.).
- `recursiveFindDenom` greedily subtracts from the largest denominator down. Any remainder is stored as `balance`; non-zero balance aborts processing with a user-visible error.
- `getAmountCostCombination` computes `totalCost` from the product price map, optionally multiplied by Smile.one's `priceModifier` (regional surcharge). Non-SC suppliers always use modifier 1.

### Telegram supplier commands (webhook side)

- `/d <orderId>` in the BSG or NICK group → mark done, write to Google Sheets, notify customer (`ORDER_DONE`), reply into the supplier group with minutes-to-complete, sync Postgres from Firestore.
- `/f <orderId> <reason>` → mark error with `errorMessage = reason`, notify internal group (`notifyOrderError`), reply "Order marked as fail" to supplier group.

### Daily summaries

`sendDailySalesSummary` posts a per-game rollup (`totalSalesCount`, `totalIncome`, `totalCost`, `totalProfit`, `currentPlatformCredit`, `BSGWalletBalance`) to the internal group. `sendSupplierDailySalesSummary` posts a per-supplier-per-game rollup to each supplier's group.

---

## 11. External integrations

### 11.1 Smile.one (supplier `SC`) — direct HTTP scraping

- Product catalog (MLBB pids): `13→86 diamonds`, `23→172`, `25→257`, `26→706`, `27→2195`, `28→3688`, `29→5532`, `30→9288`, `32→Starlight pass`, `33→Twilight pass`, `34→Starlight Plus`.
- Endpoints used:
  - `POST /merchant/mobilelegends/checkrole/` — must be called before `query` to warm the session.
  - `POST /merchant/mobilelegends/query/` — returns `{ code, username, flowid, change_price, use }`. `change_price > 1.25` triggers a red warning in the Telegram order-created message.
  - `POST /merchant/mobilelegends/pay` — x-www-form-urlencoded, includes the `_csrf` token. Success detection by response URL being `https://www.smile.one/message/success` AND body contains the Portuguese string `Pagamento com sucesso`.
  - `GET /customer/activationcode/codelist?type=orderlist&p=<page>&pageSize=10&status=&startdate=YYYY-MM-DD&enddate=YYYY-MM-DD` — for reconciliation reports.
- Auth: `PHPSESSID` cookie + `_csrf` form field, both fetched from the home-server `POST /puppeteer/getSmileOneData` (the App Engine instance cannot run the puppeteer login).
- Garena FF ID check: `POST https://shop.garena.my/api/auth/player_id_login` with `{ app_id: 100067, login_id }`; nickname is XSS-sanitized and control-character-stripped.

### 11.2 Backstreet Gamer (supplier `BSG`) — Telegram relay (active) + HTTP (commented)

- Active path: send a templated Telegram message tagging `@bsong85 @ocl4188` to `TELEGRAM_SUPPLIER_ONGBS_GROUP_ID`, with tap-to-copy `<amount> <gameId>`, `/d <orderId>`, and `/f <orderId> write_fail_reason` blocks. Result `message_id` is saved on the order as `telegramOrderMsgId`.
- Legacy HTTP path (preserved in the code but short-circuited): `backstreetgamer.com/sign-in` → `/save-transaction` with `ProductId`/`ProductDetailId` (variant URL map is `BSGProductVariantUrl` by game + amount) using `ci_sys_sessions` cookie. Kept only for reference.
- `getBSGWalletBalance` currently short-circuits to `'0'`; the original scrape is commented out.

### 11.3 NICK supplier — Telegram relay only

Same pattern as BSG; mentions `@NickOngg`.

### 11.4 Telegram Bot API

- Outbound: `GET https://api.telegram.org/bot<TOKEN>/sendMessage` with `chat_id`, `parse_mode=HTML`, `text`, and optional `reply_markup.inline_keyboard`. All messages use the `<pre>` tag for monospaced blocks. Every outbound message from `telegram.ts` includes an inline keyboard with Messenger, Spreadsheet, and Smile.One buttons.
- Inbound: webhook as described in §9. Identity is the chat id: only two hard-coded group ids count as "suppliers".

### 11.5 Manychat

- `POST https://api.manychat.com/fb/sending/sendFlow` (by `flow_ns`) — used for scenario replies. Flow namespaces used:
  - `content20210721132904_776103` → INFORM_WRITE_REVIEW
  - `content20210328152842_755422` → INFORM_ORDER_DONE
  - `content20210601085500_793987` → INFORM_ORDER_REJECT
  - `content20210601082821_252599` → INFORM_ORDER_VERIFIED
  - `content20210723190105_374831` → INFORM_WRONG_ID
- `POST https://api.manychat.com/fb/sending/sendContent` — used for ad-hoc messages (e.g. the receipt-received confirmation in `/order/create_external`). Uses `message_tag: ACCOUNT_UPDATE`.
- Bearer auth via `MANYCHAT_API_KEY`.

### 11.6 FlowXO

- Single HTTP hook at `FLOWXO_CALLBACK_URL`. Messages are sent via `GET` with query string `{ responsePath, message, imageUrl, orderId? }`.
- `responsePath` is provided by FlowXO when a user message triggers a flow; the backend stores it on the order so subsequent notifications reach the same conversation.

### 11.7 Google Sheets

- Spreadsheet id `JOMINI_BUSINESS_SPREADSHEET_ID`; the main sheet is `Income2020` with column layout defined by the `GS_MLBB_*_COL` env vars. Sheets for other games are named `PUBG`, `FF`, `WR`, `GE`.
- Auth is OAuth2 web-app flow; refresh token persisted to `token.json`. Scope: `spreadsheets`.
- `ManyChat Integration` tab holds legacy per-game price lists (`getCostPriceFromSheet` maps them to the in-memory price map; superseded by the `product` table but still used by the sync script).
- Read: `spreadsheets.values.batchGet`. Write: `spreadsheets.values.batchUpdate` with `valueInputOption=USER_ENTERED` (formulas are written into cells). Clear: `spreadsheets.values.clear`.
- Helpers:
  - `generateMLBBOrderGSData` / `generateGenericOrderData` — write one row of order data.
  - `generateMLBBNonOrderData` / `generateGenericNonOrderData` — add daily running total formula `=SUM(P<from>:P<to>)` etc. and per-day row counter `#N`.
  - `updateSpreadSheetBusinessAccTotal` — writes Maybank balance into `Profit2020!C35`.

### 11.8 Firebase

- **Firestore**: `order`, `allowedUser`, `statistic/mlbb`.
- **Firebase Auth**: verifies the `Authorization` header for admin API calls; the UID must appear in `allowedUser`.
- **Firebase Storage**: `jomini-enterprise.appspot.com`. Used by `/order/create_external` to upload receipts (`order/<orderId>/<filename>`) and made public via `file.makePublic()`.

### 11.9 Billplz (Malaysian payment gateway)

- V3 API; Basic auth with base64-encoded `BILLPLZ_SECRET`.
- `GET /api/v3/collections` — used to match a collection by game name.
- `POST /api/v3/bills` — creates a bill with `collection_id`, `email`, `name`, `amount` (cents), `callback_url = <BILLPLZ_CALLBACK_URL>/webhook/billplz/payment_callback`. Returns `{ id, url }` used as `invoiceId` on the order.
- `GET /api/v3/fpx_banks` / `GET /api/v4/payment_gateways` — supporting metadata.
- Callback body includes `id` and `paid` (string `"true"`/`"false"`); when paid, the order is auto-processed by calling `processOrder` directly with a stub `req`/`res`.
- NOTE: `createBill` invocation inside `createOrder` is currently commented out in production; the Billplz flow is effectively dormant but still wired for reactivation.

### 11.10 Home puppeteer server (`HOME_SERVER_IP`, auth via `HOME_SERVER_TOKEN`)

A separate service hosted at `http://jomini-enterprise.tplinkdns.com:3456` (dev: `http://localhost:3456`). The App Engine process talks to it because headless Chromium is not available on GAE Standard. All calls use `authorization: HOME_SERVER_TOKEN` (plain string, not Bearer).

| Endpoint | Purpose |
| --- | --- |
| `POST /puppeteer/getBankSS` (body `{ orderId }`) | Logs into Maybank2U, captures statement screenshots + current balance, uploads screenshots somewhere reachable, returns `{ status, message, data: { screenshotUrls, currentBalance } }`. |
| `POST /puppeteer/getSmileOneData` | Logs into Smile.one, returns `{ status, phpsessid, csrf, productIdMap, message? }` where `productIdMap` maps amount → `{ pid }`. |
| `POST /puppeteer/getBSGData` | Logs into Backstreet Gamer, returns `{ status, ciSysSessions, message? }`. |
| `POST /puppeteer/sendDiamond` (reference only) | Legacy path where the home server itself did the Smile.one order. |

The home server is the only moving part that handles Chromium-scraping credentials (`SMILEONE_GOOGLE_*`, `MBB_*`, `BSG_*`). None of those credentials are exercised directly from the backend in production.

---

## 12. Scripts & operational commands

From `package.json`:

| Command | What it does |
| --- | --- |
| `npm run build` | `tsc` + copies `public/` and `views/` to `build/`. |
| `npm start` | Runs `entry.ts` through `ts-node` with `.env`. Used as the GAE `entrypoint`. |
| `npm run serve` | `nodemon` in dev, loads `.env.dev`. |
| `npm run seed` / `:production` | Executes `database/seed.ts`. |
| `npm run script` / `:prod` | Executes `script/temp-script.ts`. |
| `npm run cleanup-game-id` | One-shot DB cleanup. |
| `npm run sync-gsheet-price-to-db` | Reads the `ManyChat Integration` tab and upserts prices into the `product` table for every supplier × game (or a subset via `--game` and `--supplier`). |
| `npm run gs-setup` | First-time Google Sheets OAuth — reads `google-sheets-api-credentials.json`, opens a URL in the terminal, prompts for the code, writes `token.json`. |
| `npm run migration:create` / `:run` / `:revert` | TypeORM CLI against `database/data-source.ts`. |
| `npm run sync-order-to-gs` | Manual catchup of orders to Google Sheets. |
| `npm run deploy` | `gcloud config set project jomini-enterprise && gcloud app deploy && gcloud app logs tail -s default`. |
| `npm run format` | `tsc --noEmit --strict` + `lint-staged`. |

Husky pre-commit runs `prettier --list-different --write` and `eslint --cache --fix` via `lint-staged`.

---

## 13. Quirks, tech debt, and things to replicate carefully

- **Persistent-store is process-local** — single-instance deploy is therefore required (`app.yaml` pins `min_instances: 1`, `max_instances: 1`). A new implementation should use Redis / a DB row if scaling beyond one instance is desired.
- **MYT timezone math is done by adding `28800000 ms` (8 h) manually** in `/daily_sales_update` and `/detailed_order_history`. Prefer `dayjs.tz('Asia/Kuala_Lumpur')` in the new app (the module is already configured).
- **Firestore is treated as the source of truth during the order lifecycle**; Postgres is only updated at status transitions. New app can unify to a single store.
- **`order.processStatus` is a free-string**, not an enum in Postgres. Some places compare against `'closed'`, `'refund'`, `'done'`, `'open'`, `'processing'`, `'error'`.
- **`Source` values are bare strings** elsewhere (`flowxo_bot`, `manychat_bot`) — any new code must keep writing those exact values or FlowXO logic in `notify.ts` breaks.
- **`MANYCHAT_WEBHOOK_TOKEN` is the single CustomAuth header** shared across all webhook / external clients. New app should still accept this exact token for `/order/create` and `/stock_status`.
- **Billplz flow is wired but disabled** (commented out in `createOrder`). Keep the webhook live; optionally rebuild payment flow later.
- **BSG direct HTTP ordering is fully commented out** — production only uses the Telegram relay. The code remains for reference.
- **`getSmileCoinAmount` and `getBSGWalletBalance` currently return stubs** (`-1` and `'0'`). Live balance display is effectively off.
- **`/test` and `/test/process` endpoints are live** in production but mounted behind auth; they can trigger real outbound actions.
- **All Telegram callbacks return `{status:'successful'}` on any error** to avoid Telegram's retry-once behavior causing duplicate orders.
- **`ormconfig.json` holds a stale second DB configuration** (`jomini-enterprise-sgp-do-user-10377804-0.b.db.ondigitalocean.com`) and is no longer used by runtime; only the DataSource in `database/data-source.ts` matters.
- **The `_seconds`/`_nanoseconds` shapes returned by Firestore** are hand-converted with `transformFirebaseDate` — forgetting this around Firestore reads leads to `Date` fields staying as Firestore Timestamps.
- **Error handling in supplier flows swallows exceptions liberally** to keep the main pipeline moving (e.g. every `notifyUser` call is wrapped in try/catch that only logs).
- **CORS allowlist is split by `,`** — `CORS_ALLOWED_ORIGIN=a,b` supports multiple origins.
- **Google OAuth refresh token** (`token.json`) is committed in the repo and needs to stay valid; `npm run gs-setup` regenerates it interactively.

---

## 14. Quick "first thing to do in v2" checklist (for the planning AI)

1. **Preserve** `POST /order/create` and `GET /stock_status` paths, payloads, response shapes, and the `CustomAuth: MANYCHAT_WEBHOOK_TOKEN` header as hard contract. Mount them behind any new gateway at the same public URL.
2. Replace in-process `persistent-store` with a shared lock store (Redis recommended).
3. Decide whether to retain the Firestore-as-hot-store pattern or collapse to Postgres + a realtime layer of your choice.
4. Re-create the product/denomination splitting logic (greedy, with manual overrides) exactly, including the Smile.one MLBB custom pairs (344, 516, 1050, 1222, 2539).
5. Keep the home-server pattern for anything that requires headless Chromium (Maybank statement scrape, Smile.one login, BSG login), or replace those flows with supported APIs.
6. Replicate the two Telegram-webhook commands (`/d`, `/f`) and the "post to supplier group" format (with the tap-to-copy command lines), otherwise existing supplier muscle memory breaks.
7. Keep writing to the `Income2020` Google Sheet (or explicitly migrate the owner's bookkeeping). The column layout is driven by the `GS_MLBB_*` env vars and is non-negotiable for current accounting.
8. Maintain the Billplz V3 bill + webhook contract so reactivation is a flag flip.
9. Preserve the Manychat `flow_ns` values and the FlowXO `responsePath`-based notification model so existing chatbot flows keep delivering messages to customers.
