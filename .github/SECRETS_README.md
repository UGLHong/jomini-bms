# GitHub & DigitalOcean Secrets Setup Guide

This directory contains tools to securely manage secrets for your Jomini BMS deployment.

## Files Overview

### `.github/_secrets.template`
- **Purpose:** Template showing all required secrets and their format
- **Status:** Safe to commit (no real values)
- **When to use:** Reference for what secrets you need

### `.github/_secrets` (created after setup)
- **Purpose:** Your actual secrets configuration
- **Status:** NEVER commit (in .gitignore)
- **When to use:** Local reference for what to upload to GitHub and DigitalOcean
- **Security:** Readable only by you (chmod 600)

### `.github/setup-secrets.sh`
- **Purpose:** Interactive script to create and configure secrets
- **Status:** Safe to commit
- **When to use:** Initial setup

## Quick Start (3 steps, 10 minutes)

### Step 1: Run the Setup Script
```bash
bash .github/setup-secrets.sh
```

This script will:
- Ask you for each secret value
- Generate random values for JWT and webhook tokens
- Create `.github/_secrets` file with your values
- Set proper file permissions (600 - owner read/write only)
- Add `.github/_secrets` to .gitignore

### Step 2: Upload to GitHub
1. Copy secrets from `.github/_secrets`
2. Go to: **Settings → Secrets and variables → Actions**
3. Add these 4 secrets:
   - `DIGITALOCEAN_ACCESS_TOKEN`
   - `DO_APP_ID`
   - `DO_APP_DOMAIN`
   - `DEPLOY_ALERT_WEBHOOK` (optional)

### Step 3: Upload to DigitalOcean
1. Go to: **DigitalOcean Dashboard → Apps → jomini-bms → Settings**
2. Scroll to: **Environment variables → Edit**
3. Add all remaining variables from `.github/_secrets`:
   - 9 marked as `type: SECRET`
   - 14 marked as `type: GENERAL`

## Manual Setup (if you prefer not to use the script)

### Option A: Use the Template
1. Copy the template:
   ```bash
   cp .github/_secrets.template .github/_secrets
   ```

2. Edit with your values:
   ```bash
   nano .github/_secrets
   # or: vim .github/_secrets
   ```

3. Verify it's gitignored:
   ```bash
   grep ".github/_secrets" .gitignore
   # Should output: .github/_secrets
   ```

### Option B: Manual Text Entry
1. Create a new file: `.github/_secrets`
2. Copy all key=value pairs from `.github/_secrets.template`
3. Fill in actual values
4. Save and verify it's gitignored

## Security Best Practices

✅ **DO:**
- Store original `.github/_secrets` safely (your local machine)
- Keep backup in password manager (1Password, Bitwarden, etc.)
- Rotate tokens every 90 days
- Use unique secrets for dev, staging, and production
- Review GitHub Actions logs regularly
- Enable 2FA on GitHub and DigitalOcean

❌ **DON'T:**
- Commit `.github/_secrets` to git
- Share secrets in Slack, email, or chat
- Reuse tokens across environments
- Store plaintext secrets in documentation
- Log secrets in error messages
- Hardcode secrets in application code

## File Permissions

The `.github/_secrets` file should have strict permissions:

```bash
# Check current permissions
ls -l .github/_secrets
# Should show: -rw------- (600)

# Fix permissions if needed
chmod 600 .github/_secrets
```

Linux/Mac only: `-rw-------` (owner read/write)
Windows: ACL restricted to your user

## Generating Secrets Manually

If you want to generate specific secrets without running the full script:

### JWT Secrets
```bash
# Generate 32-byte hex string
openssl rand -hex 32

# Example output:
# a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0
```

### Telegram Webhook Token
```bash
openssl rand -hex 16

# Use for TELEGRAM_WEBHOOK_TOKEN
```

### Database URL
```
Format: postgres://username:password@host:port/database?sslmode=require

Examples:
- postgres://jomini:mypassword@db.prod.com:5432/jomini?sslmode=require
- postgres://postgres:pass@localhost:5432/jomini?sslmode=require
```

## Retrieving Secrets from Other Sources

### DigitalOcean API Token
1. Go to: https://cloud.digitalocean.com/account/api/tokens
2. Click: **Generate New Token**
3. Name: `jomini-bms-deploy`
4. Select scope: **Apps** (read+write)
5. Copy token immediately (only shown once)
6. Use as: `DIGITALOCEAN_ACCESS_TOKEN`

### DigitalOcean App ID
```bash
# List all apps
doctl apps list --format UUID,Spec.Name

# Or: Go to dashboard and check URL
# Format: https://cloud.digitalocean.com/apps/{UUID}
```

### Supabase Keys
1. Go to: https://supabase.com
2. Select your project
3. Go to: **Settings (bottom left) → API**
4. Copy:
   - `ANON_KEY` → `NUXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SERVICE_ROLE_KEY` → `SUPABASE_SERVICE_ROLE_KEY`

### Telegram Bot Token
1. Open Telegram
2. Find: **@BotFather**
3. Send: `/newbot`
4. Follow setup prompts
5. Copy: `123456789:ABCdefGHIjklmnoPQRstuvWXYZ`
6. Use as: `TELEGRAM_BOT_TOKEN`

### Telegram Group Chat IDs
1. Create groups in Telegram for:
   - Internal alerts
   - BSG supplier notifications
   - NICK supplier notifications

2. Send a message in each group

3. Get chat IDs:
   ```bash
   # Replace YOUR_TOKEN with your Telegram bot token
   curl https://api.telegram.org/botYOUR_TOKEN/getUpdates
   ```

4. Look for in the response:
   ```json
   "chat": {
     "id": -1001234567890,
     "type": "supergroup"
   }
   ```

5. Copy negative IDs like: `-1001234567890`

## Troubleshooting

### "Permission denied" when running setup script
```bash
# Make script executable
chmod +x .github/setup-secrets.sh

# Then run
bash .github/setup-secrets.sh
```

### "File already exists" message
The script will ask if you want to overwrite existing `.github/_secrets`
- Press `y` to replace
- Press `n` to keep existing file

### ".github/_secrets" accidentally committed
```bash
# Remove from git (but keep local copy)
git rm --cached .github/_secrets

# Make sure it's gitignored
echo ".github/_secrets" >> .gitignore

# Commit the fix
git add .gitignore
git commit -m "fix: gitignore secrets file"

# ROTATE YOUR SECRETS if they were exposed!
```

### Can't find Telegram chat ID
```bash
# If getUpdates returns no updates, send a test message:
# In your group, type: "test"

# Then retry the curl command:
curl https://api.telegram.org/botYOUR_TOKEN/getUpdates | jq '.result[0].message.chat.id'
```

### Database connection fails on deploy
- Verify `DATABASE_URL` includes `?sslmode=require`
- Check database is accessible from DO app's IP
- Verify username and password are correct
- Test locally: `psql $DATABASE_URL`

## Verification Checklist

Before committing and deploying:

```bash
# ✅ Secrets file exists and is gitignored
ls -la .github/_secrets
grep ".github/_secrets" .gitignore

# ✅ File has secure permissions
ls -l .github/_secrets
# Should show: -rw------- (600)

# ✅ File not staged for commit
git status
# Should NOT show: .github/_secrets

# ✅ All required variables filled
grep "=" .github/_secrets | grep -v "^#" | wc -l
# Should show: 23 lines

# ✅ GitHub secrets added
# Verify in: Settings → Secrets and variables → Actions

# ✅ DigitalOcean variables added
# Verify in: Apps → Settings → Environment variables
```

## Related Files

- `DEPLOYMENT_READY.md` — Deployment checklist
- `docs/DEPLOYMENT_GUIDE.md` — Comprehensive deployment guide
- `.env.example` — Application environment template
- `.gitignore` — Git ignore rules (includes `.github/_secrets`)

## Questions?

See the full deployment guide for more details:
```bash
# Read comprehensive guide
cat docs/DEPLOYMENT_GUIDE.md

# Or check troubleshooting section
grep -A 50 "## Troubleshooting" docs/DEPLOYMENT_GUIDE.md
```

## Security Summary

Your secrets are now:
- ✅ Template documented (`.github/_secrets.template`)
- ✅ Locally stored and gitignored (`.github/_secrets`)
- ✅ Ready for upload to GitHub and DigitalOcean
- ✅ Never committed to version control
- ✅ Protected with file permissions (600)

You're ready to deploy! 🚀