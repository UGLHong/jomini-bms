# Cutover runbook — Jomini Enterprise → Jomini BMS (Nuxt 3)

This runbook describes the production cutover from the legacy GAE-hosted
Jomini Enterprise backend to the new Nuxt 3 application on DigitalOcean App
Platform. The legacy Postgres database is reused; the Firestore hot-store is
retired and replaced by Postgres + self-hosted Supabase realtime.

## 0. Pre-flight (T-7 days)

1. Provision the DigitalOcean App with `app.do.yaml` and create all required
   secrets in the control panel (see `.env.example`).
2. Add the App's egress IP range to Postgres' trusted IPs (or use a VPC peering).
3. Spin up self-hosted Supabase and point it at the same Postgres. Note the
   `anon` and `service_role` keys.
4. Run `npm run db:migrate-legacy -- --dry-run` against a **copy** of the
   production DB. Review the log for any column mismatches and patch
   `scripts/migrate-legacy.ts` as needed.
5. Run the app pre-deploy job once (`npm run db:migrate`) against the copy DB
   to apply Drizzle migrations 0000 and 0001.
6. Run `npm run db:seed` against the copy DB (safe, idempotent).
7. Smoke-test the `/order/create` and `/stock_status` contracts using the
   production `CUSTOM_AUTH_TOKEN` (see `tests/unit/externalEnvelope.test.ts`
   for the envelope shape).

## 1. Freeze window (T-1 hour)

1. Put the old GAE backend into read-only / maintenance mode so that no new
   orders are created in legacy Firestore.
2. Drain any in-flight Firestore orders through the legacy `archive_all`
   endpoint. Confirm that Firestore `order` collection is empty.

## 2. Data migration (T-0)

1. Point `DATABASE_URL` at production Postgres and take a full `pg_dump` backup.
2. Rename any legacy tables that would collide with the new Drizzle schema
   (primarily `order`, but the script covers all `public.*` tables the new
   schema creates):

   ```bash
   npm run db:rename-for-cutover -- --dry-run
   npm run db:rename-for-cutover
   ```

   This renames `order → order_legacy`, `product → product_legacy`, etc.,
   inside a single transaction. Re-running is safe (it skips anything already
   renamed).
3. Apply Drizzle migrations:

   ```bash
   npm run db:migrate
   ```

   The migrator refuses to run if step 2 was skipped and collisions still
   exist, so you'll get a clear error instead of a partially-applied schema.
4. Run the legacy migration script in dry-run first, then for real:

   ```bash
   npm run db:migrate-legacy -- --dry-run
   npm run db:migrate-legacy
   ```

5. Seed the new tables (games / suppliers / default products / admin user):

   ```bash
   SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... npm run db:seed
   ```

6. Verify row counts match between the renamed `*_legacy` tables and the new
   tables.

## 3. DNS / routing

1. Flip the production domain for FlowXO callbacks to the new DigitalOcean app.
2. Legacy URLs `/order/create` and `/stock_status` are already proxied by Nitro
   `routeRules` to the canonical `/api/*` handlers; no FlowXO configuration
   change is required.
3. Update the Telegram bot webhook:

   ```bash
   npm run telegram:set-webhook -- --url=https://<new-host>/api/telegram/webhook
   ```

## 4. Smoke tests

1. `GET /api/health` → `{ ok: true }`.
2. `POST /order/create` with a canary FlowXO payload and the old `CustomAuth`.
   Compare the response body byte-for-byte with a captured legacy response.
3. `GET /stock_status?game=mlbb` — verify the envelope (`status`, `data.*`,
   `restockAtString`, `stockMessage`).
4. Sign in as the admin user, verify:
   - `/orders` shows live orders and the chime plays for a new order
   - Games / suppliers / products / stock admin pages load and save
   - Reports page loads and CSV exports download
5. Create an `external_link` in the admin UI, open it on a phone and submit a
   test order. Confirm the Telegram group receives a notification.

## 5. Rollback

If any smoke test fails and cannot be resolved in < 15 minutes:

1. Flip the FlowXO callback domain back to the old GAE backend.
2. Re-enable Firestore writes on the old app.
3. Because the legacy migration does `ON CONFLICT (id) DO NOTHING`, it is safe
   to re-run after fixing.

## 6. Clean-up (T+7 days)

1. Remove the legacy project from GAE.
2. Disable any Firebase auth users that were migrated to the new custom auth.
3. Remove the Firestore billing, Firebase Storage receipt bucket, and
   Google Sheets writer credentials.
4. Archive `current_backend_implementation.md` / `current_frontend_implementation.md`
   under `docs/legacy/` for future reference.

## Script reference

| Script | Purpose |
| --- | --- |
| `npm run db:migrate` | Apply Drizzle schema migrations. Refuses to run on a non-Drizzle DB that still contains colliding legacy tables. |
| `npm run db:rename-for-cutover [-- --dry-run]` | One-shot helper that renames colliding legacy tables (`order`, `product`, ...) to `<name>_legacy` inside a transaction. Safe to re-run. |
| `npm run db:migrate-legacy [-- --dry-run] [-- --only=orders]` | Migrate legacy column names & copy any legacy `order_*` tables into the new `order`. |
| `npm run db:seed` | Insert baseline games/suppliers/products/admin user (idempotent). |
| `npm run telegram:set-webhook` | Configure Telegram webhook URL. |
