# Docker Setup Guide - Local Infrastructure

## 1. Docker Compose - Complete Stack

### `docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: ai-pc-postgres
    environment:
      POSTGRES_USER: ai_user
      POSTGRES_PASSWORD: dev_password
      POSTGRES_DB: ai_pc_dev
      POSTGRES_INITDB_ARGS: "--encoding=UTF8 --locale=en_US.UTF-8"
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ai_user -d ai_pc_dev"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - ai-pc-network

  postgres_shadow:
    image: postgres:15-alpine
    container_name: ai-pc-postgres-shadow
    environment:
      POSTGRES_USER: ai_user
      POSTGRES_PASSWORD: dev_password
      POSTGRES_DB: ai_pc_shadow
    ports:
      - "5433:5432"
    volumes:
      - postgres_shadow_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ai_user -d ai_pc_shadow"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - ai-pc-network

  redis:
    image: redis:7-alpine
    container_name: ai-pc-redis
    command: redis-server --appendonly yes --requirepass redis_password
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - ai-pc-network

  # Optional: PgAdmin (PostgreSQL Management UI)
  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: ai-pc-pgadmin
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@example.com
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"
    depends_on:
      - postgres
    networks:
      - ai-pc-network

  # Optional: Redis Commander (Redis Management UI)
  redis-commander:
    image: rediscommander/redis-commander:latest
    container_name: ai-pc-redis-commander
    environment:
      - REDIS_HOSTS=local:redis:6379:0:redis_password
    ports:
      - "8081:8081"
    depends_on:
      - redis
    networks:
      - ai-pc-network

volumes:
  postgres_data:
  postgres_shadow_data:
  redis_data:

networks:
  ai-pc-network:
    driver: bridge
```

## 2. Docker Compose Komutları

```bash
# Tüm servisleri başlat (background'da)
docker-compose up -d

# Servisleri başlat ve log'ları görüntüle
docker-compose up

# Servisleri durdur
docker-compose down

# Tüm data'yı sil (clean slate)
docker-compose down -v

# Spesifik servisi yeniden başlat
docker-compose restart postgres

# Servis durumunu kontrol et
docker-compose ps

# Servis log'larını görüntüle
docker-compose logs postgres
docker-compose logs -f redis  # Follow mode

# Database'ye bağlan
docker-compose exec postgres psql -U ai_user -d ai_pc_dev

# Redis CLI
docker-compose exec redis redis-cli -a redis_password
```

## 3. Database Initialization Script

### `scripts/init-db.sql`

```sql
-- PostgreSQL initialization script

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";

-- Create users
CREATE USER IF NOT EXISTS ai_user WITH PASSWORD 'dev_password' CREATEDB;

-- Create databases
CREATE DATABASE ai_pc_dev OWNER ai_user;
CREATE DATABASE ai_pc_shadow OWNER ai_user;
CREATE DATABASE ai_pc_test OWNER ai_user;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ai_pc_dev TO ai_user;
GRANT ALL PRIVILEGES ON DATABASE ai_pc_shadow TO ai_user;
GRANT ALL PRIVILEGES ON DATABASE ai_pc_test TO ai_user;

-- Logging setup (optional)
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_duration = on;
SELECT pg_reload_conf();

\c ai_pc_dev ai_user;

-- Create enum types
CREATE TYPE user_tier AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE ai_engine AS ENUM ('openai', 'gemini', 'claude', 'ollama');
CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system');
CREATE TYPE sync_status AS ENUM ('success', 'failed', 'partial');

-- Set default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ai_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ai_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO ai_user;

COMMIT;
```

## 4. Local Development Setup Script

### `scripts/setup-docker.sh`

```bash
#!/bin/bash
set -e

echo "🐳 Starting Docker containers..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local..."
    cp .env.example .env.local
fi

# Start Docker Compose
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
while [ "$(docker-compose ps -q postgres | wc -l)" -eq 0 ]; do
    echo "  Waiting for PostgreSQL..."
    sleep 2
done

while [ "$(docker-compose ps -q redis | wc -l)" -eq 0 ]; do
    echo "  Waiting for Redis..."
    sleep 2
done

echo "✅ Docker containers started!"
echo ""
echo "📊 Available UIs:"
echo "  - PgAdmin: http://localhost:5050 (admin@example.com / admin)"
echo "  - Redis Commander: http://localhost:8081"
echo ""
echo "🔧 Connection strings:"
echo "  - PostgreSQL: postgresql://ai_user:dev_password@localhost:5432/ai_pc_dev"
echo "  - Redis: redis://localhost:6379/0"
echo ""

# Run migrations
echo "🔄 Running database migrations..."
pnpm prisma migrate dev

echo "✨ Setup complete!"
```

## 5. Docker Commands Cheat Sheet

```bash
# === Container Yönetimi ===

# Container'ları liste
docker ps -a

# Container'ı başlat
docker start container_name

# Container'ı durdur
docker stop container_name

# Container'ı kaldır
docker rm container_name

# Container'ı yeniden başlat
docker restart container_name


# === Image Yönetimi ===

# Image'ları liste
docker images

# Image'ı kaldır
docker rmi image_name

# Image'ı build et
docker build -t image_name:tag .


# === Volume Yönetimi ===

# Volume'leri liste
docker volume ls

# Volume'ü inspektle
docker volume inspect volume_name

# Volume'ü kaldır
docker volume rm volume_name


# === Network Yönetimi ===

# Network'leri liste
docker network ls

# Network'ü inspektle
docker network inspect network_name


# === Debugging ===

# Container log'larını görüntüle
docker logs container_name

# Container'a bağlan (bash)
docker exec -it container_name bash

# Container içinde komut çalıştır
docker exec container_name whoami

# Container'ın resource usage'ını görüntüle
docker stats container_name
```

## 6. Makefile - Kolaylaştırılmış Komutlar

### `Makefile`

```makefile
.PHONY: help docker-up docker-down docker-logs db-seed db-reset dev lint test build

help:
	@echo "📋 Available commands:"
	@echo "  make docker-up      - Start Docker containers"
	@echo "  make docker-down    - Stop Docker containers"
	@echo "  make docker-logs    - Show Docker logs"
	@echo "  make db-seed        - Seed database with test data"
	@echo "  make db-reset       - Reset database to initial state"
	@echo "  make dev            - Start development server"
	@echo "  make lint           - Run ESLint"
	@echo "  make type-check     - Run TypeScript type check"
	@echo "  make test           - Run tests"
	@echo "  make build          - Build for production"

docker-up:
	@echo "🐳 Starting Docker containers..."
	docker-compose up -d
	@echo "✅ Docker containers started"

docker-down:
	@echo "🛑 Stopping Docker containers..."
	docker-compose down
	@echo "✅ Docker containers stopped"

docker-logs:
	docker-compose logs -f

db-seed:
	@echo "🌱 Seeding database..."
	pnpm prisma db seed

db-reset:
	@echo "🔄 Resetting database..."
	pnpm prisma migrate reset --force
	pnpm prisma db seed

dev:
	@echo "🚀 Starting development server..."
	pnpm dev

lint:
	@echo "🔍 Running ESLint..."
	pnpm eslint src --max-warnings 0

type-check:
	@echo "📝 Type checking..."
	pnpm tsc --noEmit

test:
	@echo "🧪 Running tests..."
	pnpm vitest

build:
	@echo "🏗️  Building for production..."
	pnpm build

# Composite commands
setup: docker-up db-seed
	@echo "✨ Setup complete!"

clean: docker-down
	rm -rf .next build dist node_modules

full-reset: clean setup
	@echo "🎉 Full reset complete!"
```

## 7. GitHub Actions - Docker Image Build

### `.github/workflows/docker-build.yml`

```yaml
name: Build Docker Images

on:
  push:
    branches: [main]
    paths:
      - 'Dockerfile*'
      - 'docker-compose.yml'
      - '.github/workflows/docker-build.yml'

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        dockerfile:
          - Dockerfile
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          file: ./${{ matrix.dockerfile }}
          push: true
          tags: ${{ secrets.DOCKER_USERNAME }}/ai-pc-system:latest
          cache-from: type=registry,ref=${{ secrets.DOCKER_USERNAME }}/ai-pc-system:buildcache
          cache-to: type=registry,ref=${{ secrets.DOCKER_USERNAME }}/ai-pc-system:buildcache,mode=max
```

## 8. Troubleshooting

### Port Already in Use

```bash
# PostgreSQL port 5432 kullanımda
lsof -i :5432  # Process'i bul
kill -9 <PID>  # Process'i kapat

# Veya farklı port kullan
# docker-compose.yml'de ports bölümünü değiştir
# ports:
#   - "5434:5432"  # Local: 5434, Container: 5432
```

### Database Connection Issues

```bash
# Database'ye bağlanmayı test et
docker-compose exec postgres psql -U ai_user -d ai_pc_dev

# Redis'e bağlanmayı test et
docker-compose exec redis redis-cli -a redis_password ping

# Network kontrol
docker network inspect ai-pc-network
```

### Container Logs

```bash
# Tüm logs
docker-compose logs

# Spesifik servis
docker-compose logs postgres

# Son 100 satır
docker-compose logs --tail 100

# Real-time follow
docker-compose logs -f redis
```

---

Bu setup, tam bir local development environment sağlar. Herhangi bir sorun için `docker logs` ile debug et!
