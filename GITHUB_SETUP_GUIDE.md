# GitHub Repository Setup Guide

## 1. Repository Oluşturma

```bash
# GitHub'da yeni repository oluştur:
# - Adı: ai-pc-system
# - Private (önerilen başlangıçta)
# - Initialize with: .gitignore (Node), License (MIT)

# Lokal setup
git clone https://github.com/YOUR_USERNAME/ai-pc-system.git
cd ai-pc-system

# İlk commit
git config user.name "Your Name"
git config user.email "your.email@example.com"

# .gitignore düzelt (Başarılı olması için)
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
.nyc_output/

# Production
.next/
out/
dist/

# Misc
.DS_Store
*.pem
.env
.env.local
.env.*.local

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
Thumbs.db

# Vercel
.vercel
.env.*.local
EOF

git add .gitignore
git commit -m "chore: add comprehensive gitignore"
```

## 2. Branch Strategy (Git Flow)

```bash
# Main branches
main              # Production-ready code
develop           # Integration branch

# Feature branches
feature/ai-router
feature/gmail-integration
feature/audio-processing

# Bugfix branches
bugfix/auth-issue
bugfix/rate-limiting

# Hotfix branches
hotfix/critical-bug

# Release branches
release/v1.0.0

# Naming convention
feature/FEATURE_NAME
bugfix/ISSUE_NUMBER-description
docs/description
chore/description
```

### Branch Protections Kuralları

GitHub Settings → Branches → main branch kuralları:

```
☑ Require pull request reviews before merging (1 review)
☑ Require status checks to pass before merging
  ☑ GitHub Actions: build
  ☑ GitHub Actions: tests
  ☑ GitHub Actions: type-check
☑ Require branches to be up to date before merging
☑ Dismiss stale pull request approvals
☑ Require code owners review
☑ Require approval of the most recent push
☑ Include administrators
```

## 3. Commit Message Convention

```
feat: add new feature
fix: fix a bug
docs: documentation only
style: formatting, missing semicolons
refactor: code refactoring
perf: performance improvements
test: adding or updating tests
chore: dependency updates, build config

Format: <type>(<scope>): <subject>

feat(auth): implement OAuth 2.0 flow
fix(ai-router): handle fallback engine correctly
docs(readme): add installation instructions
chore(deps): upgrade next.js to 14.1
```

### Commit Template

```bash
git config commit.template ~/.gitmessage

cat > ~/.gitmessage << 'EOF'
# <type>(<scope>): <subject>
#
# <body>
#
# <footer>

# Type: feat, fix, docs, style, refactor, perf, test, chore
# Scope: what module or feature
# Subject: max 50 chars, imperative mood
# Body: explain what and why, max 72 chars per line
# Footer: reference issues with "Closes #123"
EOF
```

## 4. PR (Pull Request) Workflow

### PR Template (`.github/pull_request_template.md`)

```markdown
## Açıklama
Yapılan değişikliklerin kısa açıklaması

## Tür
- [ ] Bug fix
- [ ] Yeni feature
- [ ] Kırılmayan değişiklik
- [ ] Documentation update

## Test Edilen
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review tamamlandı
- [ ] Comments added
- [ ] Tests added/updated
- [ ] No console.log remaining
- [ ] Breaking changes? (dokumentasyon güncellendi)

## İlişkili İssues
Closes #123
```

### PR Yazarken

```bash
# Feature branch'i oluştur
git checkout -b feature/amazing-feature

# Commit ve push et
git add .
git commit -m "feat(module): add amazing feature"
git push origin feature/amazing-feature

# GitHub'da PR oluştur
# 1. Branch'i main'e merge et
# 2. PR açıklamasını doldur
# 3. 1 reviewer assign et
```

## 5. GitHub Actions CI/CD Setup

### `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20.x]
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
      
      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9
      
      - name: Setup pnpm cache
        uses: actions/setup-node@v3
        with:
          cache: pnpm
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run lint
        run: pnpm lint
      
      - name: Run type check
        run: pnpm type-check
      
      - name: Run unit tests
        run: pnpm test:unit
        env:
          DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/test"
      
      - name: Run integration tests
        run: pnpm test:integration
        env:
          DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/test"
      
      - name: Build
        run: pnpm build
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

### `.github/workflows/deploy.yml`

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel
        uses: vercel/action@master
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          production: true
```

## 6. Repository Ayarları

### Secrets Management

```bash
# Vercel deploy için
Settings → Secrets → New repository secret

# Özel secrets:
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
OPENAI_API_KEY
GEMINI_API_KEY
ANTHROPIC_API_KEY
DATABASE_URL
WEBHOOK_SECRET
```

### Code Owners (`.github/CODEOWNERS`)

```
# Bu dosya kim tarafından review'lenecek belirtir

* @main-developer

# Modüle göre
/src/lib/ai/ @ai-specialist
/prisma/ @database-developer
/src/app/api/ @backend-developer
/src/components/ @frontend-developer
```

## 7. Local Development Setup Komutları

```bash
# Repository'i klonla
git clone https://github.com/YOUR_USERNAME/ai-pc-system.git
cd ai-pc-system

# Branch'i checkoutla
git checkout develop
git pull origin develop

# Feature branch'i oluştur
git checkout -b feature/new-feature

# Bağımlılıkları yükle
pnpm install

# .env.local dosyasını ayarla
cp .env.example .env.local
# .env.local'ı düzenle

# Database'i migrate et
pnpm prisma migrate dev

# Development sunucusunu başlat
pnpm dev

# PR'a hazır olması için
pnpm lint:fix
pnpm type-check
pnpm test
pnpm build

# Commit ve push
git add .
git commit -m "feat: implement new feature"
git push origin feature/new-feature

# GitHub'da PR oluştur
# https://github.com/YOUR_USERNAME/ai-pc-system/compare/develop...feature/new-feature
```

## 8. Troubleshooting

### Merge Conflict Çözmek

```bash
# Main branch'ı pull et
git fetch origin main
git rebase origin/main

# Conflict'leri çöz (editor'de)
# Sonra
git add .
git rebase --continue
git push origin feature/name --force-with-lease
```

### Yanlış Branch'a Commit Ettim

```bash
# Commit'i geri al
git reset --soft HEAD~1

# Doğru branch'a geç
git checkout correct-branch

# Commit'i tekrar yap
git commit -m "message"
```

### Staging Area'dan Dosya Çıkarmak

```bash
git reset HEAD file-to-unstage.ts
```

---

Bu setup, profesyonel bir development workflow ve CI/CD pipeline sağlar.
