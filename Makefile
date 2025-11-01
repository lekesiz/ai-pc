# Makefile for AI-PC System

.PHONY: help install install-backend install-frontend docker-up docker-down docker-restart db-migrate backend frontend test lint format clean

help: ## Show this help message
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

install: install-backend install-frontend ## Install all dependencies

install-backend: ## Install backend dependencies
	cd backend && python -m venv venv && \
	. venv/bin/activate && \
	pip install --upgrade pip && \
	pip install -r requirements.txt

install-frontend: ## Install frontend dependencies
	cd frontend && npm install

docker-up: ## Start Docker services
	docker-compose up -d

docker-down: ## Stop Docker services
	docker-compose down

docker-restart: docker-down docker-up ## Restart Docker services

docker-logs: ## View Docker logs
	docker-compose logs -f

db-migrate: ## Run database migrations
	cd backend && . venv/bin/activate && \
	alembic upgrade head

db-reset: ## Reset database
	cd backend && . venv/bin/activate && \
	alembic downgrade base && \
	alembic upgrade head

backend: ## Run backend development server
	cd backend && . venv/bin/activate && \
	python -m app.main

frontend: ## Run frontend development server
	cd frontend && npm start

dev: ## Run both backend and frontend in development mode
	make -j 2 backend frontend

test: ## Run tests
	cd backend && . venv/bin/activate && \
	pytest

test-coverage: ## Run tests with coverage
	cd backend && . venv/bin/activate && \
	pytest --cov=app --cov-report=html

lint: ## Run linters
	cd backend && . venv/bin/activate && \
	flake8 app && \
	mypy app

format: ## Format code
	cd backend && . venv/bin/activate && \
	black app && \
	isort app

clean: ## Clean up generated files
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "htmlcov" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "venv" -exec rm -rf {} + 2>/dev/null || true