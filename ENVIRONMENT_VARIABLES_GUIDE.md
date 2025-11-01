# Environment Variables Comprehensive Guide

## 1. Development Environment (.env.local)

```bash
# Database Configuration
DATABASE_URL="postgresql://ai_user:dev_password@localhost:5432/ai_pc_dev"
SHADOW_DATABASE_URL="postgresql://ai_user:dev_password@localhost:5432/ai_pc_shadow"

# Redis Cache
REDIS_URL="redis://localhost:6379/0"

# AI Providers
OPENAI_API_KEY="sk-proj-..." # https://platform.openai.com/api-keys
OPENAI_ORGANIZATION_ID="org-..."

GEMINI_API_KEY="AIza..." # https://ai.google.dev
GEMINI_PROJECT_ID="your-project-id"

ANTHROPIC_API_KEY="sk-ant-..." # https://console.anthropic.com/

# Optional: Local LLM
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="mistral"

# Google OAuth & APIs
GOOGLE_CLIENT_ID="...apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="..."
GOOGLE_CALLBACK_URL="http://localhost:3000/api/auth/google/callback"

# Gmail API
GMAIL_API_KEY="..." # Same as Google Client
GMAIL_REDIRECT_URI="http://localhost:3000/api/gmail/callback"

# Google Drive API
DRIVE_API_KEY="..."
DRIVE_REDIRECT_URI="http://localhost:3000/api/drive/callback"

# NextAuth Configuration
NEXTAUTH_SECRET="$(openssl rand -base64 32)" # Random secret
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SESSION_STRATEGY="database" # or "jwt"

# Security & CORS
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001"
CORS_CREDENTIALS="true"

# Logging & Monitoring
LOG_LEVEL="debug" # debug, info, warn, error
NODE_ENV="development"

# Rate Limiting
RATE_LIMIT_REQUESTS="1000"
RATE_LIMIT_WINDOW_MS="60000" # 1 minute

# Feature Flags
FEATURE_AUDIO_PROCESSING="true"
FEATURE_GMAIL_SYNC="true"
FEATURE_DRIVE_SYNC="true"

# Optional: Webhooks (local testing)
WEBHOOK_SECRET="test-secret-do-not-use-in-prod"

# Optional: Sentry (error tracking)
SENTRY_DSN=""
```

### .env.local Nasıl Oluşturulur?

```bash
# 1. Örnek dosyayı kopyala
cp .env.example .env.local

# 2. Değerleri doldur (API keys'i al)
nano .env.local  # veya vim, code, etc.

# 3. Değişiklikleri kaydet (git track etme!)
# .gitignore'da zaten var: .env.local

# 4. Doğrulamak için
pnpm run env:validate
```

## 2. Staging Environment (.env.staging)

```bash
# Staging: production benzeri test ortamı

DATABASE_URL="postgresql://user:pass@staging-db.amazonaws.com:5432/ai_pc_staging"
SHADOW_DATABASE_URL="postgresql://user:pass@staging-db-shadow.amazonaws.com:5432/ai_pc_shadow"

REDIS_URL="redis://staging-redis.internal:6379/0"

# API Keys - Staging accounts kullan
OPENAI_API_KEY="sk-proj-staging-..."
GEMINI_API_KEY="AIza-staging-..."
ANTHROPIC_API_KEY="sk-ant-staging-..."

# Google OAuth - Staging credentials
GOOGLE_CLIENT_ID="staging-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="staging-secret"
GOOGLE_CALLBACK_URL="https://staging.your-domain.com/api/auth/google/callback"

NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="https://staging.your-domain.com"

# Monitoring
LOG_LEVEL="info"
NODE_ENV="staging"

# Optional: Vercel Preview
VERCEL_ENV="preview"
VERCEL_BRANCH_URL="https://ai-pc-system-staging.vercel.app"

# Error Tracking
SENTRY_DSN="https://your-staging-sentry-dsn.ingest.sentry.io/..."
SENTRY_ENVIRONMENT="staging"
```

## 3. Production Environment (Vercel)

```bash
# Production: Customer-facing environment

# Database - Production RDS
DATABASE_URL="postgresql://prod_user:${DB_PASSWORD}@prod-db-instance.c.amazonaws.com:5432/ai_pc_prod"
SHADOW_DATABASE_URL="postgresql://prod_user:${DB_PASSWORD}@prod-db-shadow.c.amazonaws.com:5432/ai_pc_shadow"

# Redis - Production ElastiCache
REDIS_URL="rediss://prod-redis.internal:6379/0" # Encrypted connection

# AI Providers - Production keys with proper rate limits
OPENAI_API_KEY="${PROD_OPENAI_API_KEY}"
OPENAI_ORGANIZATION_ID="org-prod-..."

GEMINI_API_KEY="${PROD_GEMINI_API_KEY}"
GEMINI_PROJECT_ID="prod-project-id"

ANTHROPIC_API_KEY="${PROD_ANTHROPIC_API_KEY}"

# Google Services - Production credentials
GOOGLE_CLIENT_ID="prod-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="${PROD_GOOGLE_CLIENT_SECRET}"
GOOGLE_CALLBACK_URL="https://your-domain.com/api/auth/google/callback"

# NextAuth
NEXTAUTH_SECRET="${NEXTAUTH_SECRET_PROD}" # Strong, random
NEXTAUTH_URL="https://your-domain.com"

# Security
ALLOWED_ORIGINS="https://your-domain.com,https://app.your-domain.com"
CORS_CREDENTIALS="true"

# Logging & Monitoring
LOG_LEVEL="warn"
NODE_ENV="production"

# Observability
SENTRY_DSN="https://your-prod-sentry-dsn.ingest.sentry.io/..."
SENTRY_ENVIRONMENT="production"
SENTRY_TRACES_SAMPLE_RATE="0.1" # 10% of transactions

DATADOG_API_KEY="${DATADOG_API_KEY}"
DATADOG_APP_KEY="${DATADOG_APP_KEY}"

# Rate Limiting - Production values
RATE_LIMIT_REQUESTS="10000"
RATE_LIMIT_WINDOW_MS="60000"

# Feature Flags - Production
FEATURE_AUDIO_PROCESSING="true"
FEATURE_GMAIL_SYNC="true"
FEATURE_DRIVE_SYNC="true"
FEATURE_NEW_UI="true"

# Email Configuration
SENDGRID_API_KEY="${SENDGRID_API_KEY}"
SENDGRID_FROM_EMAIL="noreply@your-domain.com"

# Cloud Storage (Backups)
AWS_REGION="eu-west-1"
AWS_S3_BUCKET="ai-pc-system-prod-backups"
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}"
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}"

# Vercel Production Settings
VERCEL_ENV="production"
VERCEL_ANALYTICS_ID="${VERCEL_ANALYTICS_ID}"

# Security Headers
STRICT_TRANSPORT_SECURITY="max-age=31536000; includeSubDomains"
CONTENT_SECURITY_POLICY="default-src 'self'; script-src 'self' 'unsafe-inline'"
```

### Production'a Nasıl Deploy Edilir?

```bash
# 1. Vercel CLI kullan
vercel env add OPENAI_API_KEY production
vercel env add GEMINI_API_KEY production
# ... Tüm secrets için tekrarla

# Veya 2. Vercel Dashboard kullan
# Settings → Environment Variables → Add

# 3. Deploy et
vercel deploy --prod

# 4. Secrets status'unu kontrol et
vercel env ls
```

## 4. Environment Variables Validation

### `lib/env.ts`

```typescript
import { z } from 'zod'

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  SHADOW_DATABASE_URL: z.string().url().optional(),
  
  // Redis
  REDIS_URL: z.string().url(),
  
  // AI Providers
  OPENAI_API_KEY: z.string().min(20),
  GEMINI_API_KEY: z.string().min(20),
  ANTHROPIC_API_KEY: z.string().min(20),
  
  // Google
  GOOGLE_CLIENT_ID: z.string().min(10),
  GOOGLE_CLIENT_SECRET: z.string().min(10),
  
  // NextAuth
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  
  // Environment
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']),
})

export const env = envSchema.parse(process.env)

// Usage:
// import { env } from '@/lib/env'
// console.log(env.OPENAI_API_KEY)
```

### Validation Script

```bash
# package.json
{
  "scripts": {
    "env:validate": "node scripts/validate-env.js"
  }
}

# scripts/validate-env.js
const { execSync } = require('child_process')

try {
  require('../lib/env.ts')
  console.log('✓ Environment variables valid')
  process.exit(0)
} catch (error) {
  console.error('✗ Environment variables validation failed:')
  console.error(error.message)
  process.exit(1)
}
```

## 5. Secrets Management Best Practices

### DO's ✅

```bash
# Store in .env.local (git ignored)
✓ Use strong, random secrets
✓ Rotate secrets regularly
✓ Use different secrets per environment
✓ Keep secrets out of code
✓ Use environment-specific credentials
✓ Store in secure vault (1Password, LastPass)
✓ Audit access logs
```

### DON'Ts ❌

```bash
# Don't do these!
✗ Commit secrets to Git
✗ Share secrets in Slack/email
✗ Use same secrets across environments
✗ Store secrets in code comments
✗ Use weak or default secrets
✗ Share .env.local with others
✗ Push secrets to GitHub
```

## 6. Local Development Setup

```bash
#!/bin/bash
# scripts/setup-env.sh

set -e

echo "🔧 Setting up environment variables..."

# Generate NEXTAUTH_SECRET
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Create .env.local
cat > .env.local << EOF
# Database
DATABASE_URL="postgresql://ai_user:dev_password@localhost:5432/ai_pc_dev"
SHADOW_DATABASE_URL="postgresql://ai_user:dev_password@localhost:5432/ai_pc_shadow"

# Redis
REDIS_URL="redis://localhost:6379/0"

# NextAuth
NEXTAUTH_SECRET="$NEXTAUTH_SECRET"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth - FILL THESE IN
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# AI Providers - FILL THESE IN
OPENAI_API_KEY=""
GEMINI_API_KEY=""
ANTHROPIC_API_KEY=""

# Logging
LOG_LEVEL="debug"
NODE_ENV="development"
EOF

echo "✓ .env.local created!"
echo "⚠️  Please fill in the following:"
echo "   - GOOGLE_CLIENT_ID"
echo "   - GOOGLE_CLIENT_SECRET"
echo "   - OPENAI_API_KEY"
echo "   - GEMINI_API_KEY"
echo "   - ANTHROPIC_API_KEY"

# Validate
pnpm env:validate
```

## 7. Docker Compose Secrets

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: ai_user
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
      POSTGRES_DB: ai_pc_dev
    secrets:
      - db_password
  
  redis:
    image: redis:7
    command: redis-server --requirepass ${REDIS_PASSWORD}

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

## 8. Environment Checklist

```bash
# Development Setup
☐ DATABASE_URL set to local PostgreSQL
☐ REDIS_URL set to local Redis
☐ OPENAI_API_KEY set
☐ GEMINI_API_KEY set
☐ ANTHROPIC_API_KEY set
☐ GOOGLE_CLIENT_ID set
☐ GOOGLE_CLIENT_SECRET set
☐ NEXTAUTH_SECRET generated
☐ Validation script passes (pnpm env:validate)

# Staging Setup
☐ All development variables for staging accounts
☐ Staging database credentials
☐ Staging Redis instance
☐ Staging Google OAuth credentials
☐ SENTRY_DSN configured

# Production Setup (Vercel)
☐ All secrets added to Vercel environment
☐ DATABASE_URL uses prod RDS
☐ REDIS_URL uses prod ElastiCache
☐ All API keys are production keys
☐ NEXTAUTH_SECRET is strong & random
☐ SENTRY environment set to "production"
☐ Error tracking active
☐ Monitoring configured
```

---

**Önemli:** Secrets'ı asla code'a commit etme. `.gitignore` zaten `.env*` dosyalarını exclude ediyor.
