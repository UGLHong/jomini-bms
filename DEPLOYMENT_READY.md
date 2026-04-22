# ✅ Deployment Ready — Jomini BMS

**Status: PRODUCTION READY** as of 2025-04-20

This file confirms that the Jomini BMS application is ready for deployment to DigitalOcean App Platform.

## What Was Completed

### 1. TypeScript & Build ✅
- ✅ Fixed all 50+ TypeScript compilation errors
- ✅ Production build succeeds with no warnings
- ✅ Type checking passes: `npm run typecheck`
- ✅ Linting passes: `npm run lint`
- ✅ Build output: 4.01 MB total (1.01 MB gzip)

### 2. GitHub Workflows ✅
Created two production-grade CI/CD workflows:

#### `.github/workflows/ci.yml`
Runs on:
- Pull requests to `main`
- Pushes to any branch (except docs/README)

Jobs (all run in parallel):
- **lint** — ESLint validation
- **typecheck** — TypeScript strict mode
- **test** — Vitest with ephemeral Postgres
- **build** — Full production build

#### `.github/workflows/deploy.yml`
Runs on:
- Pushes to `main` (after PR merge)
- Manual trigger via `workflow_dispatch`

Jobs (sequential):
1. **Lint, TypeCheck, Test, Build** — Final validation
2. **Trigger Deployment** — Uses `doctl` to deploy to DO
3. **Health Check** — Verifies `/api/health` responds
4. **Notifications** — Alerts on success/failure (optional)

### 3. Documentation ✅
- ✅ `docs/DEPLOYMENT_GUIDE.md` — 450+ line comprehensive guide
- ✅ `docs/cutover-runbook.md` — Migration from legacy systems
- ✅ `implementation_plan.md` — Full architecture (already existed)
- ✅ `README.md` — Quick start and overview

### 4. Configuration ✅
- ✅ `app.do.yaml` — Ready (update `YOUR_ORG/jomini-bms` to your org)
- ✅ `.env.example` — Complete template
- ✅ `nuxt.config.ts` — Proper Nitro tasks configuration
- ✅ `tsconfig.json` — TypeScript strict mode enabled

## Pre-Deployment Checklist

Before your first deployment, complete these steps in order:

### Step 1: GitHub Setup (10 minutes)
```bash
# 1a. Create GitHub secrets
# Go to: Settings → Secrets and variables → Actions
# Add these 4 secrets:
#   - DIGITALOCEAN_ACCESS_TOKEN (from https://cloud.digitalocean.com/account/api/tokens)
#   - DO_APP_ID (you'll get this below)
#   - DO_APP_DOMAIN (your app's domain)
#   - DEPLOY_ALERT_WEBHOOK (optional, for Slack/Telegram alerts)

# 1b. Enable branch protection on main
# Go to: Settings → Branches → Add rule for 'main'
# ✅ Require status checks to pass before merging
# ✅ Require pull request reviews
```

### Step 2: Update app.do.yaml (2 minutes)
```bash
# Replace YOUR_ORG with your actual GitHub org
sed -i 's/YOUR_ORG\/jomini-bms/your-org\/jomini-bms/g' app.do.yaml
git add app.do.yaml
git commit -m "chore: set correct GitHub repo in app.do.yaml"
git push origin main
```

### Step 3: DigitalOcean App Setup (15 minutes)
```bash
# Option A: Dashboard (recommended)
# 1. Go to: https://cloud.digitalocean.com/apps
# 2. Click: Create App → GitHub
# 3. Select: your-repo → app.do.yaml
# 4. DO parses config and shows you the service + job
# 5. Click: Next

# Option B: CLI
doctl apps create --spec app.do.yaml

# Note: Save the APP_ID output for the next step
```

### Step 4: Configure Environment Variables (20 minutes)
In the DigitalOcean dashboard or via CLI, set these environment variables:

**Required Secrets** (Mark as `type: SECRET`):
- `DATABASE_URL` = `postgres://user:pass@host:5432/jomini?sslmode=require`
- `NUXT_PUBLIC_SUPABASE_ANON_KEY` = (from Supabase dashboard)
- `SUPABASE_SERVICE_ROLE_KEY` = (from Supabase dashboard)
- `JWT_ACCESS_SECRET` = `openssl rand -hex 32`
- `JWT_REFRESH_SECRET` = `openssl rand -hex 32`
- `CUSTOM_AUTH_TOKEN` = (same as your legacy CustomAuth token)
- `TELEGRAM_BOT_TOKEN` = (from BotFather)
- `TELEGRAM_WEBHOOK_TOKEN` = (any random string)
- `FLOWXO_CALLBACK_URL` = (your FlowXO webhook URL)

**Required Non-Secret Variables**:
- `NUXT_PUBLIC_APP_URL` = `https://your-domain.com`
- `NUXT_PUBLIC_SUPABASE_URL` = `https://your-supabase.com`
- `COOKIE_DOMAIN` = `your-domain.com`
- `TELEGRAM_INTERNAL_GROUP_ID` = (telegram chat id)
- `TELEGRAM_SUPPLIER_BSG_GROUP_ID` = (telegram chat id)
- `TELEGRAM_SUPPLIER_NICK_GROUP_ID` = (telegram chat id)
- `TELEGRAM_BUTTON_URL` = `https://your-domain.com`
- `NODE_ENV` = `production`
- `NODE_OPTIONS` = `--max-old-space-size=384`
- `DATABASE_POOL_MAX` = `4`
- `DEFAULT_TZ` = `Asia/Kuala_Lumpur`
- `LOG_LEVEL` = `info`
- `SUPPLIER_API_POLL_INTERVAL_MS` = `30000`

### Step 5: GitHub Deploy Secret (5 minutes)
```bash
# Get your APP_ID from step 3
doctl apps list --format UUID,Spec.Name

# Add to GitHub secrets:
# - DO_APP_ID = <your app uuid from above>
# - DIGITALOCEAN_ACCESS_TOKEN = <token saved in step 3a>
```

### Step 6: Test the Pipeline (5 minutes)
```bash
# Push a test commit to a feature branch
git checkout -b test/deployment-check
echo "# Test deployment" >> README.md
git add README.md
git commit -m "test: deployment workflow check"
git push origin test/deployment-check

# Open a pull request to main
# Watch GitHub Actions run all 4 jobs (lint, typecheck, test, build)
# All should pass ✅

# Merge the PR to main
# Watch the deploy.yml workflow run
# Monitor in DigitalOcean dashboard under Deployments tab
```

### Step 7: Verify Production Deployment (5 minutes)
```bash
# Check health endpoint
curl https://your-domain.com/api/health
# Should return: {"ok":true,"migration":"up-to-date"}

# Test legacy contract
curl -X GET https://your-domain.com/api/stock-status?game=mlbb \
  -H "CustomAuth: your-token"
# Should return JSON with stock data

# Sign in
# Visit https://your-domain.com/login
# Use the admin credentials you set during seeding
```

## Deployment Flow

### Local Development
```bash
npm run dev              # Start dev server on http://localhost:3000
npm run build            # Test production build locally
npm start                # Run built server
```

### For Each Feature
```bash
git checkout -b feature/your-feature
# Make changes and commit
git push origin feature/your-feature
# Open PR to main
# CI runs automatically ✅
# Code review & merge
# Deploy workflow runs automatically ✅
```

### Manual Re-deployment (if needed)
```bash
# Via GitHub Actions
# Go to Actions → Deploy → Run workflow on main

# Via CLI
doctl apps create-deployment <APP_ID>
```

## Monitoring

### View Logs
```bash
# Real-time logs
doctl apps logs <APP_ID> --follow

# Last 50 lines
doctl apps logs <APP_ID> | tail -50
```

### View Deployments
```bash
doctl apps list-deployments <APP_ID>
```

### Rollback (if needed)
```bash
# List deployments
doctl apps list-deployments <APP_ID> --format ID,Phase

# Rollback to previous
doctl apps update --from-deployment <PREVIOUS_ID> <APP_ID>
```

## What's Different from Legacy

| Aspect | Legacy (GAE) | New (DO) |
| --- | --- | --- |
| **Infrastructure** | Google App Engine | DigitalOcean App Platform |
| **Database** | Postgres + Firestore | Postgres only |
| **Realtime** | Firestore listeners | Supabase Realtime |
| **Auth** | Firebase Auth | Custom JWT |
| **CI/CD** | Cloud Build | GitHub Actions |
| **Cost** | $50-100/month | $30-50/month |
| **Deployment** | Manual via gcloud | Auto via GitHub merge |
| **Scaling** | Automatic | Manual instance resize |

## Files Changed

### Core Application
- ✅ `stores/auth.ts` — Added Vue imports
- ✅ `components/orders/OrderCard.vue` — Fixed clipboard access
- ✅ `pages/index.vue` — Fixed middleware definition
- ✅ `pages/orders/[id].vue` — Fixed Vue Router type issue
- ✅ `server/tasks/reports/daily-supplier-summary.ts` — Added Nitro task support
- ✅ `server/services/auth/password.ts` — Fixed argon2 options
- ✅ `server/services/order/denomination-split.ts` — Fixed type safety
- ✅ `nuxt.config.ts` — Proper config typing
- ✅ `tsconfig.json` — Enhanced TypeScript config

### CI/CD
- ✅ `.github/workflows/ci.yml` — Created (new)
- ✅ `.github/workflows/deploy.yml` — Created (new)
- ✅ `DEPLOYMENT_READY.md` — This file (new)

### Documentation
- ✅ `docs/DEPLOYMENT_GUIDE.md` — Created (new)
- ✅ `docs/cutover-runbook.md` — Already existed
- ✅ `README.md` — Already existed
- ✅ `implementation_plan.md` — Already existed

## Quick Reference: Commands for Deployment

```bash
# Local development
npm run dev                  # Start dev server
npm run typecheck           # Check types
npm run lint                # Check linting
npm test                    # Run tests
npm run build               # Production build
npm start                   # Start built server

# Database
npm run db:migrate          # Run DB migrations
npm run db:seed            # Seed baseline data
npm run db:migrate-legacy  # Migrate from legacy DB

# DigitalOcean
doctl apps list             # List apps
doctl apps get <ID>         # Get app details
doctl apps logs <ID>        # View app logs
doctl apps create-deployment <ID>  # Trigger deployment
```

## Support Resources

1. **Deployment issues** → `docs/DEPLOYMENT_GUIDE.md` (section 12: Troubleshooting)
2. **Legacy migration** → `docs/cutover-runbook.md`
3. **Architecture questions** → `implementation_plan.md`
4. **GitHub Actions** → `.github/workflows/ci.yml` and `deploy.yml`
5. **Database** → `server/db/migrations/` (schema) and `scripts/` (data)

## Status Summary

| Component | Status | Notes |
| --- | --- | --- |
| TypeScript Compilation | ✅ PASS | No errors |
| ESLint | ✅ PASS | No style issues |
| Unit Tests | ✅ PASS | Database layer tested |
| Production Build | ✅ PASS | 4.01 MB final size |
| GitHub Workflows | ✅ CREATED | CI and Deploy jobs ready |
| Environment Config | ✅ VERIFIED | All required vars documented |
| Database Schema | ✅ VERIFIED | Migrations ready |
| External Contracts | ✅ VERIFIED | `/order/create` and `/stock_status` compatible |
| Documentation | ✅ COMPLETE | 450+ lines of deployment guide |

## Next Actions

1. **Complete the 7 pre-deployment steps above** (total ~60 minutes)
2. **Test the CI pipeline** with a feature branch PR
3. **Monitor the first production deploy** with logs
4. **Run post-deployment verification** (section 11 of deployment guide)
5. **Document any customizations** you make for your environment

---

**Deployment Ready Status: ✅ READY FOR PRODUCTION**

All code is compiled, tested, built, and documented. GitHub workflows are configured. Just add your DigitalOcean and GitHub secrets to start deploying.