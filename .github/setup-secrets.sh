#!/bin/bash

# Jomini BMS - Secrets Setup Helper Script
# This script helps you set up the .github/_secrets file with your actual values
# Usage: bash .github/setup-secrets.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_FILE="$SCRIPT_DIR/_secrets.template"
SECRETS_FILE="$SCRIPT_DIR/_secrets"
GITIGNORE_FILE=".gitignore"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
  echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
  print_header "Checking Prerequisites"

  if [ ! -f "$TEMPLATE_FILE" ]; then
    print_error "Template file not found: $TEMPLATE_FILE"
    exit 1
  fi
  print_success "Template file exists"

  if [ -f "$SECRETS_FILE" ]; then
    print_warning "Secrets file already exists: $SECRETS_FILE"
    read -p "Do you want to overwrite it? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      print_info "Keeping existing secrets file"
      return 0
    fi
  fi

  if ! grep -q ".github/_secrets" "$GITIGNORE_FILE"; then
    print_warning ".github/_secrets not in .gitignore"
    echo ".github/_secrets" >> "$GITIGNORE_FILE"
    print_success "Added .github/_secrets to .gitignore"
  else
    print_success ".github/_secrets is in .gitignore"
  fi
}

# Prompt for secrets
prompt_for_secrets() {
  print_header "Enter Your Secrets"

  declare -A secrets

  # GitHub Secrets
  print_info "GITHUB SECRETS (for CI/CD workflows)"
  echo ""

  read -p "DigitalOcean API Token (from https://cloud.digitalocean.com/account/api/tokens): " -s DIGITALOCEAN_ACCESS_TOKEN
  echo
  secrets["DIGITALOCEAN_ACCESS_TOKEN"]="$DIGITALOCEAN_ACCESS_TOKEN"

  read -p "DigitalOcean App ID (from 'doctl apps list'): " DO_APP_ID
  secrets["DO_APP_ID"]="$DO_APP_ID"

  read -p "App Domain (e.g., jomini-bms.ondigitalocean.app): " DO_APP_DOMAIN
  secrets["DO_APP_DOMAIN"]="$DO_APP_DOMAIN"

  read -p "Deploy Alert Webhook URL (optional, press Enter to skip): " DEPLOY_ALERT_WEBHOOK
  if [ -n "$DEPLOY_ALERT_WEBHOOK" ]; then
    secrets["DEPLOY_ALERT_WEBHOOK"]="$DEPLOY_ALERT_WEBHOOK"
  fi

  # DigitalOcean Secrets
  echo ""
  print_info "DIGITALOCEAN SECRETS (required)"
  echo ""

  read -p "Database URL (postgres://user:pass@host/db?sslmode=require): " -s DATABASE_URL
  echo
  secrets["DATABASE_URL"]="$DATABASE_URL"

  read -p "Supabase Anon Key: " -s NUXT_PUBLIC_SUPABASE_ANON_KEY
  echo
  secrets["NUXT_PUBLIC_SUPABASE_ANON_KEY"]="$NUXT_PUBLIC_SUPABASE_ANON_KEY"

  read -p "Supabase Service Role Key: " -s SUPABASE_SERVICE_ROLE_KEY
  echo
  secrets["SUPABASE_SERVICE_ROLE_KEY"]="$SUPABASE_SERVICE_ROLE_KEY"

  read -p "JWT Access Secret (or press Enter to generate): " JWT_ACCESS_SECRET
  if [ -z "$JWT_ACCESS_SECRET" ]; then
    JWT_ACCESS_SECRET=$(openssl rand -hex 32)
    print_success "Generated JWT Access Secret: $JWT_ACCESS_SECRET"
  fi
  secrets["JWT_ACCESS_SECRET"]="$JWT_ACCESS_SECRET"

  read -p "JWT Refresh Secret (or press Enter to generate): " JWT_REFRESH_SECRET
  if [ -z "$JWT_REFRESH_SECRET" ]; then
    JWT_REFRESH_SECRET=$(openssl rand -hex 32)
    print_success "Generated JWT Refresh Secret: $JWT_REFRESH_SECRET"
  fi
  secrets["JWT_REFRESH_SECRET"]="$JWT_REFRESH_SECRET"

  read -p "Custom Auth Token (from legacy system): " CUSTOM_AUTH_TOKEN
  secrets["CUSTOM_AUTH_TOKEN"]="$CUSTOM_AUTH_TOKEN"

  read -p "Telegram Bot Token (from @BotFather): " -s TELEGRAM_BOT_TOKEN
  echo
  secrets["TELEGRAM_BOT_TOKEN"]="$TELEGRAM_BOT_TOKEN"

  read -p "Telegram Webhook Token (or press Enter to generate): " TELEGRAM_WEBHOOK_TOKEN
  if [ -z "$TELEGRAM_WEBHOOK_TOKEN" ]; then
    TELEGRAM_WEBHOOK_TOKEN=$(openssl rand -hex 16)
    print_success "Generated Telegram Webhook Token: $TELEGRAM_WEBHOOK_TOKEN"
  fi
  secrets["TELEGRAM_WEBHOOK_TOKEN"]="$TELEGRAM_WEBHOOK_TOKEN"

  read -p "FlowXO Callback URL: " FLOWXO_CALLBACK_URL
  secrets["FLOWXO_CALLBACK_URL"]="$FLOWXO_CALLBACK_URL"

  # Non-secret variables
  echo ""
  print_info "DIGITALOCEAN VARIABLES (non-secret)"
  echo ""

  read -p "Public App URL (e.g., https://api.jomini.com): " NUXT_PUBLIC_APP_URL
  secrets["NUXT_PUBLIC_APP_URL"]="$NUXT_PUBLIC_APP_URL"

  read -p "Supabase URL (e.g., https://project.supabase.co): " NUXT_PUBLIC_SUPABASE_URL
  secrets["NUXT_PUBLIC_SUPABASE_URL"]="$NUXT_PUBLIC_SUPABASE_URL"

  read -p "Cookie Domain (e.g., api.jomini.com): " COOKIE_DOMAIN
  secrets["COOKIE_DOMAIN"]="$COOKIE_DOMAIN"

  read -p "Telegram Internal Group ID: " TELEGRAM_INTERNAL_GROUP_ID
  secrets["TELEGRAM_INTERNAL_GROUP_ID"]="$TELEGRAM_INTERNAL_GROUP_ID"

  read -p "Telegram Supplier BSG Group ID: " TELEGRAM_SUPPLIER_BSG_GROUP_ID
  secrets["TELEGRAM_SUPPLIER_BSG_GROUP_ID"]="$TELEGRAM_SUPPLIER_BSG_GROUP_ID"

  read -p "Telegram Supplier NICK Group ID: " TELEGRAM_SUPPLIER_NICK_GROUP_ID
  secrets["TELEGRAM_SUPPLIER_NICK_GROUP_ID"]="$TELEGRAM_SUPPLIER_NICK_GROUP_ID"

  # Return associative array via indirect reference
  for key in "${!secrets[@]}"; do
    printf '%s=%s\n' "$key" "${secrets[$key]}"
  done
}

# Create secrets file
create_secrets_file() {
  print_header "Creating Secrets File"

  local temp_file="$SECRETS_FILE.tmp"

  # Read all secrets into an array
  local -A secrets_map
  while IFS='=' read -r key value; do
    secrets_map["$key"]="$value"
  done < <(prompt_for_secrets)

  # Create new file with secrets
  cat > "$temp_file" << 'EOF'
# Jomini BMS - Secrets Configuration
# KEEP THIS FILE PRIVATE - DO NOT COMMIT TO GIT
# This file is listed in .gitignore

# GitHub Secrets
DIGITALOCEAN_ACCESS_TOKEN=
DO_APP_ID=
DO_APP_DOMAIN=
DEPLOY_ALERT_WEBHOOK=

# DigitalOcean Secrets
DATABASE_URL=
NUXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
CUSTOM_AUTH_TOKEN=
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_TOKEN=
FLOWXO_CALLBACK_URL=

# DigitalOcean Variables
NUXT_PUBLIC_APP_URL=
NUXT_PUBLIC_SUPABASE_URL=
COOKIE_DOMAIN=
TELEGRAM_INTERNAL_GROUP_ID=
TELEGRAM_SUPPLIER_BSG_GROUP_ID=
TELEGRAM_SUPPLIER_NICK_GROUP_ID=
TELEGRAM_BUTTON_URL=
NODE_ENV=production
NODE_OPTIONS=--max-old-space-size=384
DATABASE_POOL_MAX=4
DEFAULT_TZ=Asia/Kuala_Lumpur
LOG_LEVEL=info
SUPPLIER_API_POLL_INTERVAL_MS=30000
EOF

  # Update file with actual values
  for key in "${!secrets_map[@]}"; do
    sed -i "s|^$key=.*|$key=${secrets_map[$key]}|" "$temp_file"
  done

  # Move to final location
  mv "$temp_file" "$SECRETS_FILE"
  chmod 600 "$SECRETS_FILE"

  print_success "Created secrets file: $SECRETS_FILE"
  print_warning "File permissions: 600 (owner read/write only)"
}

# Display summary
display_summary() {
  print_header "Secrets Configuration Summary"

  echo -e "${YELLOW}GITHUB SECRETS${NC}"
  echo "Add these 4 secrets via: Settings → Secrets and variables → Actions"
  echo "  • DIGITALOCEAN_ACCESS_TOKEN"
  echo "  • DO_APP_ID"
  echo "  • DO_APP_DOMAIN"
  echo "  • DEPLOY_ALERT_WEBHOOK (optional)"

  echo ""
  echo -e "${YELLOW}DIGITALOCEAN ENVIRONMENT VARIABLES${NC}"
  echo "Add these via: Apps → Settings → Environment variables"
  echo "  • 9 SECRET variables"
  echo "  • 14 GENERAL variables"

  echo ""
  echo -e "${YELLOW}NEXT STEPS${NC}"
  echo "1. Review .github/_secrets file"
  echo "2. Add GITHUB SECRETS to GitHub"
  echo "3. Add all variables to DigitalOcean"
  echo "4. Run: git push (to trigger CI workflow)"
  echo "5. Monitor: GitHub Actions and DigitalOcean dashboard"
}

# Verify secrets file
verify_secrets_file() {
  print_header "Verifying Secrets File"

  if [ ! -f "$SECRETS_FILE" ]; then
    print_error "Secrets file not created"
    exit 1
  fi

  print_success "Secrets file exists"

  # Check if it's gitignored
  grep -q ".github/_secrets" "$GITIGNORE_FILE"
  print_success "File is gitignored"

  # Count lines with values
  local count=$(grep -c "=.*" "$SECRETS_FILE" || true)
  print_success "File contains $count configuration variables"

  # Check file permissions
  local perms=$(stat -c %a "$SECRETS_FILE" 2>/dev/null || stat -f %A "$SECRETS_FILE" 2>/dev/null)
  if [ "$perms" = "600" ] || [ "$perms" = "rw-------" ]; then
    print_success "File permissions are secure (600)"
  else
    print_warning "File permissions are $perms (should be 600)"
    chmod 600 "$SECRETS_FILE"
  fi
}

# Main execution
main() {
  clear
  echo -e "${BLUE}"
  cat << "EOF"
  ╔════════════════════════════════════════════════════════════╗
  ║                                                            ║
  ║     Jomini BMS - GitHub & DigitalOcean Secrets Setup      ║
  ║                                                            ║
  ╚════════════════════════════════════════════════════════════╝
EOF
  echo -e "${NC}"

  check_prerequisites
  create_secrets_file
  verify_secrets_file
  display_summary

  echo ""
  print_success "Setup complete!"
  echo ""
  print_warning "SECURITY REMINDER:"
  echo "  • Never commit .github/_secrets to git"
  echo "  • Never share secrets in Slack, email, or chat"
  echo "  • Keep a backup in a password manager"
  echo "  • Rotate tokens every 90 days in production"
  echo ""
}

# Run main function
main
