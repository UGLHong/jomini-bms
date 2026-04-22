# DigitalOcean App Platform Deployment Guide

This guide walks you through deploying the Jomini BMS application to DigitalOcean App Platform. For the first-time migration from legacy systems, see `docs/cutover-runbook.md`.

## 1. Prerequisites

### Required Services
- DigitalOcean account with a project
- PostgreSQL database (14+) — either Managed Database or self-hosted
- Self-hosted Supabase instance (for Realtime)
- GitHub repository with branch protection on `main`
- Telegram bot token (from BotFather)
- FlowXO account (for order notifications)

### Local Tools
```bash
# Install DigitalOcean CLI
brew install doctl  # macOS
# or: apt-get install doctl (Linux) / chocolatey (Windows)

# Authenticate
doctl auth init
# Follow prompts to enter your API token from https://cloud.digitalocean.com/account/api/tokens
```

### Build Verification
```bash
npm ci
npm run build
# Verify no errors in output, build should complete with "Σ Total size: ..." message
```

## 2. GitHub Configuration

### 2.1 Create GitHub Secrets

Go to **Settings → Secrets and variables → Actions** in your GitHub repository and add:

| Secret | Value | Notes |
| --- | --- | --- |
| `DIGITALOCEAN_ACCESS_TOKEN` | [Create here](https://cloud.digitalocean.com/account/api/tokens) with `apps:write` scope | Personal access token for DO API |
| `DO_APP_ID` | Output of `doctl apps list` | UUID of the DO App Platform app (created below) |
| `DO_APP_DOMAIN` | `your-app.ondigitalocean.app` or your custom domain | Used for health checks in deploy workflow |
| `DEPLOY_ALERT_WEBHOOK` *(optional)* | Slack / Telegram webhook URL | Notifies on deploy success/failure |

### 2.2 Enable Branch Protection

Go to **Settings → Branches** and add a rule for `main`:
- ✅ Require status checks to pass before merging
- ✅ Require pull request reviews
- ✅ Require branches to be up to date before merging

This ensures all CI checks pass before code reaches production.

## 3. DigitalOcean App Platform Setup

### 3.1 Update `app.do.yaml`

Replace the placeholder in your repo root:

```bash
sed -i 's/YOUR_ORG\/jomini-bms/your-github-org\/jomini-bms/g' app.do.yaml
```

Verify the change:
```bash
grep "repo:" app.do.yaml
# Should output: repo: your-github-org/jomini-bms
```

### 3.2 Create the DO App

#### Option A: Via DigitalOcean Dashboard (Recommended for first-time setup)

1. Go to [App Platform](https://cloud.digitalocean.com/apps) → **Create App**
2. Select **GitHub** and authenticate
3. Select your repository
4. Choose the `app.do.yaml` file
5. DO will parse the configuration and show you:
   - Service: `web` (Nuxt app on port 3000)
   - Job: `migrate` (runs before each deploy)
6. Click **Next** to proceed to environment setup

#### Option B: Via `doctl` (for scripting)

```bash
doctl apps create \
  --spec app.do.yaml \
  --format UUID \
  --no-header
# Returns: <APP_UUID>
```

### 3.3 Configure Environment Variables

In the **App Platform dashboard** or via `doctl apps update`, set these variables:

#### Required Secrets (Mark as `SECRET`)

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | `postgres://user:password@host:5432/jomini?sslmode=require` |
| `NUXT_PUBLIC_SUPABASE_ANON_KEY` | From your Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | From your Supabase dashboard |
| `JWT_ACCESS_SECRET` | `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | `openssl rand -hex 32` |
| `CUSTOM_AUTH_TOKEN` | Same as your legacy `CustomAuth` header |
| `TELEGRAM_BOT_TOKEN` | From BotFather |
| `TELEGRAM_WEBHOOK_TOKEN` | Any random string for webhook validation |
| `FLOWXO_CALLBACK_URL` | Your FlowXO webhook endpoint |

#### Required Non-Secret Variables

| Variable | Value |
| --- | --- |
| `NUXT_PUBLIC_APP_URL` | `https://your-domain.com` |
| `NUXT_PUBLIC_SUPABASE_URL` | `https://your-supabase-host.com` |
| `COOKIE_DOMAIN` | `your-domain.com` |
| `TELEGRAM_INTERNAL_GROUP_ID` | Telegram chat ID for internal alerts |
| `TELEGRAM_SUPPLIER_BSG_GROUP_ID` | Telegram chat ID for BSG supplier |
| `TELEGRAM_SUPPLIER_NICK_GROUP_ID` | Telegram chat ID for NICK supplier |
| `TELEGRAM_BUTTON_URL` | `https://your-domain.com` |
| `NODE_ENV` | `production` |
| `NODE_OPTIONS` | `--max-old-space-size=384` |
| `DATABASE_POOL_MAX` | `4` |
| `DEFAULT_TZ` | `Asia/Kuala_Lumpur` |
| `LOG_LEVEL` | `info` |
| `SUPPLIER_API_POLL_INTERVAL_MS` | `30000` |

### 3.4 Configure Database Access

#### For Managed PostgreSQL:
- Ensure the DO App's egress IP is whitelisted in your database's firewall rules
- Add the database host, port, username, password to `DATABASE_URL`

#### For Supabase:
- Reuse the same PostgreSQL instance
- Configure Supabase realtime to broadcast on the `order` table

#### Verify Connectivity:
```bash
# Test from your local machine (not required, but helpful for debugging)
psql --host=<host> --user=<user> --dbname=<dbname> \
  --command="SELECT 1 as connection_test"
# Should return: (1 row)
```

## 4. Deployment Workflow

### 4.1 Development → Staging (Pull Request)

1. Create a branch and push commits
2. Open a pull request against `main`
3. GitHub Actions runs automatically:
   - ✅ `lint` — ESLint checks
   - ✅ `typecheck` — TypeScript validation
   - ✅ `test` — Vitest on ephemeral Postgres
   - ✅ `build` — Nuxt production build
4. All checks must pass before merge
5. Code review (optional, but recommended)
6. Merge to `main` (squash or merge-commit both work)

### 4.2 Production Deployment (Merge to Main)

When you merge to `main`:

1. **GitHub Actions Deploy Job Runs**
   - Checks out code
   - Runs lint, typecheck, test, build again
   - Uses `doctl` to trigger DigitalOcean deployment
   - Waits for deployment to complete (timeout: 30 minutes)
   - Runs health check against `/api/health`
   - Sends success/failure notification (if webhook configured)

2. **DigitalOcean PRE_DEPLOY Job**
   - Runs the `migrate` job (database migrations + seed)
   - Failures block the deployment automatically
   - Output visible in DO dashboard

3. **DigitalOcean Service Deploy**
   - Builds Docker image from your code
   - Replaces the running container
   - Health check confirms readiness
   - Zero-downtime with rolling updates

4. **Automatic Rollback**
   - If health check fails, DO automatically rolls back to previous deployment
   - Check the deploy logs in the DO dashboard

### 4.3 Manual Re-deployment

If you need to redeploy without code changes:

```bash
doctl apps create-deployment <APP_ID>
```

Or in GitHub Actions UI:
- Go to **Actions → Deploy**
- Click **Run workflow** on `main` branch

## 5. Database Migrations

### 5.1 Automatic Migrations

Every deployment runs the `migrate` PRE_DEPLOY job:
1. Applies any new Drizzle schema migrations from `server/db/migrations/`
2. Runs all pending data migrations from `scripts/migrations/*.ts`
3. Skips already-applied migrations (tracked in `__drizzle_migrations` table)

### 5.2 Creating a New Migration

```bash
# Schema migration (adds/modifies tables/columns)
npm run db:generate
# This creates a new file in server/db/migrations/

# Data migration (backfill, transform data)
# Create a new file: scripts/migrations/YYYY_MM_DD_description.ts
# Must match the migration runner interface (see scripts/migrate.ts)

# Test locally
npm run db:migrate
```

### 5.3 Long-Running Migrations

If a migration takes >10 minutes:
1. Split it: schema migration (fast) + data migration (slow) + code deploy (uses new schema)
2. This keeps the PRE_DEPLOY job under DO's timeout

## 6. Environment-Specific Configuration

### Development
```bash
cp .env.example .env
# Edit .env with local values:
# - DATABASE_URL=postgres://localhost:5432/jomini
# - No real secret tokens, use placeholders
npm run dev
```

### Staging (Optional)
Use a separate DO App with its own `app.do.yaml` and environment vars. Deploy from a `staging` branch.

### Production
- Use the main repository and `main` branch
- All secrets set in GitHub and DO
- Database is real, encrypted, backed up

## 7. Supplier IP Whitelisting

Some suppliers require IP whitelisting:

### quinngamingshop (nick)
1. Get the DO App's egress IP:
   ```bash
   doctl apps get <APP_ID> --format OutgoingIP
   # Or check https://cloud.digitalocean.com/apps/<APP_ID>
   ```
2. Register this IP in the [quinngamingshop dashboard](https://docs.quinngamingshop.com)
3. If DO IPs rotate, use a static IP reverse proxy or NAT droplet

## 8. Domain Configuration

### With Custom Domain
1. In DO App Platform > **Settings → Domains**
2. Add your domain (e.g., `api.jomini.com`)
3. DO provides you with DNS records to add to your registrar
4. Wait for DNS propagation (5-30 minutes)

### With Default DO Domain
- App is immediately available at `<app-name>.ondigitalocean.app`
- Set `DO_APP_DOMAIN` secret to this URL

### Update Environment Variables
After domain is live:
```bash
doctl apps update <APP_ID> \
  --env NUXT_PUBLIC_APP_URL=https://your-domain.com \
  --env COOKIE_DOMAIN=your-domain.com \
  --env TELEGRAM_BUTTON_URL=https://your-domain.com
```

Then redeploy.

## 9. Monitoring & Logs

### View Logs in DO Dashboard

1. Go to your app
2. **Logs** tab shows:
   - `[info]` — normal operations
   - `[error]` — errors and warnings
   - `[bootstrap]` — startup migrations/seed
3. Filter by component (web, migrate job, etc.)

### Monitor Health
```bash
# Check if app is healthy
curl https://your-domain.com/api/health
# Should return: {"ok":true, "migration":"up-to-date"}

# Check logs locally
doctl apps logs <APP_ID> --follow
```

### Alerts
Configure notifications in your `DEPLOY_ALERT_WEBHOOK`:
- Slack, Telegram, or custom webhook
- Triggered on deploy success/failure
- Useful for alerting the team

## 10. Rollback Procedure

### Automatic Rollback (if health check fails)
- DO automatically rolls back if `/api/health` returns non-200
- Check deploy logs in dashboard for reason

### Manual Rollback
```bash
# List recent deployments
doctl apps list-deployments <APP_ID> --format ID,Phase,CreatedAt

# Rollback to a previous deployment
doctl apps update --from-deployment <PREVIOUS_DEPLOYMENT_ID> <APP_ID>
```

Or in DO dashboard:
1. **Deployments** tab
2. Click the previous successful deployment
3. Click **Redeploy**

### Why Rollback is Safe
- Database schema migrations never delete data (they're additive)
- Old code continues to work against newer schema
- Data migrations are idempotent and tracked
- No data loss if you redeploy an older version

## 11. Post-Deployment Verification

After any production deployment:

```bash
# 1. Health check
curl https://your-domain.com/api/health

# 2. Check logs for errors
doctl apps logs <APP_ID> | tail -50

# 3. Test external contracts
curl -X GET https://your-domain.com/api/stock-status?game=mlbb \
  -H "CustomAuth: <token>"

curl -X POST https://your-domain.com/api/order/create \
  -H "CustomAuth: <token>" \
  -H "Content-Type: application/json" \
  -d '{"gameKey":"mlbb","phone":"60123456789","amount":50}'

# 4. Sign in as admin
# Visit https://your-domain.com/login
# Verify you can access /orders, /admin/games, /admin/products

# 5. Test real-time updates
# Have someone submit an order via public form
# Verify admin dashboard receives live notification + chime
```

## 12. Troubleshooting

### Deployment Fails During Migration Job
**Symptom:** Deploy succeeds but GO app never starts  
**Cause:** Database migration error  
**Fix:**
1. Check migration logs in DO dashboard
2. This is likely a schema conflict — see `docs/cutover-runbook.md` section 2
3. May need to rename legacy tables: `npm run db:rename-for-cutover`

### App Crashes After Deploy
**Symptom:** Health check fails, logs show errors  
**Cause:** Configuration missing or code issue  
**Fix:**
1. Check all required env vars are set in DO
2. Verify database connectivity: `psql $DATABASE_URL`
3. Check server logs for specific error message
4. Rollback to previous deployment while investigating

### Health Check Timeout
**Symptom:** Deploy succeeds, but health check never passes  
**Cause:** App takes too long to start, or endpoint unresponsive  
**Fix:**
1. Increase health check timeout in workflow (default: 5 min)
2. Check DO app logs for startup errors
3. Ensure `/api/health` endpoint responds quickly

### Database Connection Pool Exhausted
**Symptom:** `Error: sorry, too many clients already`  
**Cause:** Connection pool cap hit (DO basic-xxs is 4)  
**Fix:**
1. Reduce `DATABASE_POOL_MAX` (already set to 4)
2. Scale up instance size to at least `basic-xs`
3. Use a connection pooler (PgBouncer)

### Telegram/FlowXO Webhooks Not Delivered
**Symptom:** Orders created but no notifications  
**Cause:** Webhook URL not updated after deploy  
**Fix:**
```bash
npm run telegram:set-webhook -- --url=https://your-domain.com/api/telegram/webhook

# For FlowXO, manually update the callback URL in their dashboard
```

## 13. Cost Estimation

### DigitalOcean Pricing (as of 2025)
- **App Platform (basic-xxs)**: $12/month (1 instance, 512 MB RAM, shared CPU)
- **Managed Database (single node, 1GB RAM)**: ~$15/month
- **Self-hosted Supabase (droplet + storage)**: $5-20/month

**Total**: ~$32-50/month for small production deployments

Scale up instance size (`basic-xs`, `small`, etc.) as traffic grows.

## 14. Next Steps

1. ✅ Complete sections 2-3 above (GitHub + DO setup)
2. ✅ Set all environment variables
3. ✅ Run local build: `npm run build`
4. ✅ Push to GitHub and watch the CI workflow
5. ✅ Merge to `main` to trigger production deploy
6. ✅ Monitor the deploy in DO dashboard
7. ✅ Run post-deployment verification (section 11)

---

## Related Documentation

- `docs/cutover-runbook.md` — Migrating from legacy systems
- `README.md` — Project overview and quick start
- `implementation_plan.md` — Full technical architecture
- `.github/workflows/ci.yml` — CI job definitions
- `.github/workflows/deploy.yml` — Production deploy job
- `app.do.yaml` — DigitalOcean app configuration

## Support

For deployment issues, consult:
1. DO app logs (visible in dashboard)
2. GitHub Actions logs (visible in Actions tab)
3. Existing database migrations (in `/server/db/migrations/`)
4. Server startup logs (in `npm run dev` or DO logs)