# Jomini BMS

Nuxt 3 + Nitro + Postgres (self-hosted Supabase) admin app for Jomini Gaming's top-up business.

- See [implementation_plan.md](implementation_plan.md) for the full plan.
- See [AGENTS.md](AGENTS.md) for agent rules.

## Quick start

```bash
npm install
cp .env.example .env
# fill in DATABASE_URL, JWT_*, CUSTOM_AUTH_TOKEN, telegram tokens, etc.
npm run db:migrate
npm run db:seed
npm run dev
```

Dev server listens on http://localhost:3000.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Run Nuxt dev server |
| `npm run build` | Production build |
| `npm start` | Start the built server |
| `npm run typecheck` | Run Nuxt type check |
| `npm run lint` | Lint source |
| `npm test` | Run unit + integration tests |
| `npm run db:generate` | Generate a new Drizzle migration |
| `npm run db:migrate` | Apply pending Drizzle migrations (auto-run by the DO PRE_DEPLOY job) |
| `npm run db:rename-for-cutover` | One-shot: rename legacy tables that collide with the new schema to `<name>_legacy` |
| `npm run db:seed` | Seed games, suppliers, first admin (idempotent) |
| `npm run db:migrate-legacy` | Copy data from renamed legacy tables into the new schema |
| `npm run db:bootstrap` | Run seed + legacy migration once, skipping steps that already ran (same as the server-start auto-bootstrap) |
| `npm run telegram:set-webhook` | Register Telegram bot webhook against this host |

## Deployment

Deployed to DigitalOcean App Platform via `app.do.yaml` on the `basic-xxs` tier
(1 instance, 512 MB RAM, shared CPU).

**Before first deploy:**

1. Replace `YOUR_ORG/jomini-bms` in `app.do.yaml` (two occurrences) with the real
   GitHub `owner/repo` slug.
2. In the DO dashboard, set every `type: SECRET` env var (database URL with
   `?sslmode=require`, JWT secrets, Telegram + FlowXO tokens, Supabase keys).
3. Set `NUXT_PUBLIC_APP_URL` and `COOKIE_DOMAIN` to the public hostname you will
   point at the app.
4. Adjust `SUPPLIER_API_POLL_INTERVAL_MS` if you don't want 30 s polling
   (minimum effective value is 5 000 ms; `0` disables).

**Database migrations & first-run bootstrap:**

- Drizzle schema migrations in `server/db/migrations/` run automatically on
  every deploy via the `migrate` PRE_DEPLOY job in `app.do.yaml` — you never
  run them by hand in prod.
- Every time the web server starts, a Nitro plugin (`server/plugins/db-bootstrap.ts`)
  runs once, guarded by a Postgres advisory lock. It records completed steps
  in a `bootstrap_state` table, so on subsequent boots it just skips:
  - `seed:v1` — inserts baseline games/suppliers/products/admin user.
    Requires `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD` envs for the admin row
    (without them, everything else still seeds and the step is still marked
    done; create the admin later with `db:seed` after setting the envs and
    deleting the `seed:v1` row to force a re-run).
  - `legacy:v1` — only runs if legacy artifacts are detected
    (`order_legacy`, old `product.game` column, etc.). Otherwise it is
    marked skipped immediately.
- To disable the auto-run (e.g. during a planned manual cutover) set
  `DB_BOOTSTRAP_ON_START=0`.
- If `DATABASE_URL` points at the **legacy Postgres** (which already has tables
  named `order`, `product`, etc.), the PRE_DEPLOY migration will bail out with
  a clear error instead of half-applying. Fix it by running
  `npm run db:rename-for-cutover` once against that DB, then redeploy. Full
  procedure is in [docs/cutover-runbook.md](docs/cutover-runbook.md).

**After first deploy:**

1. The server-start bootstrap handles seeding + legacy copy automatically.
   Watch the `[bootstrap]` log lines on the first boot to confirm.
2. Run `npm run telegram:set-webhook` locally (with prod envs) to point
   Telegram at `/api/telegram/webhook`.
3. To re-run a step manually, delete its row from `bootstrap_state` and
   redeploy (or run `npm run db:bootstrap`).

**Notes on the `basic-xxs` tier:**

- Node runs with `--max-old-space-size=384` leaving headroom for `pg`,
  `argon2`, and Nitro.
- `DATABASE_POOL_MAX=4` keeps connection count low.
- Rate limiter is in-memory; acceptable because `instance_count: 1`. Scale out
  would require moving it to Postgres or Redis.
- The supplier-API poller runs in-process on a `setInterval`; guarded by a
  Postgres advisory lock so zero-downtime deploys never double-poll.
