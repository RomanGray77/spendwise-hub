SHELL := /bin/bash

UV ?= uv
NPM ?= npm
HOST ?= 127.0.0.1
BACKEND_PORT ?= 8000
FRONTEND_PORT ?= 5173

BACKEND_DIR := backend
FRONTEND_DIR := frontend

.DEFAULT_GOAL := help

.PHONY: help setup install backend-install frontend-install dev run backend frontend \
	test backend-test frontend-test lint format build check

help: ## Show the available commands
	@awk 'BEGIN {FS = ":.*## "; printf "Usage: make <target>\n\nTargets:\n"} /^[a-zA-Z_-]+:.*## / {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

setup: install ## Install all backend and frontend dependencies
install: backend-install frontend-install

backend-install: ## Install backend dependencies with uv
	cd $(BACKEND_DIR) && $(UV) sync

frontend-install: ## Install frontend dependencies with npm
	cd $(FRONTEND_DIR) && $(NPM) ci

dev: ## Run the backend and frontend development servers
	@cleanup() { \
		trap - INT TERM EXIT; \
		kill "$$backend_pid" "$$frontend_pid" 2>/dev/null || true; \
		wait "$$backend_pid" "$$frontend_pid" 2>/dev/null || true; \
	}; \
	(cd $(BACKEND_DIR) && $(UV) run uvicorn app.main:app --reload --host $(HOST) --port $(BACKEND_PORT)) & backend_pid=$$!; \
	(cd $(FRONTEND_DIR) && $(NPM) run dev -- --host $(HOST) --port $(FRONTEND_PORT)) & frontend_pid=$$!; \
	trap cleanup INT TERM EXIT; \
	while kill -0 "$$backend_pid" 2>/dev/null && kill -0 "$$frontend_pid" 2>/dev/null; do sleep 1; done; \
	status=0; \
	if ! kill -0 "$$backend_pid" 2>/dev/null; then wait "$$backend_pid" || status=$$?; else wait "$$frontend_pid" || status=$$?; fi; \
	cleanup; \
	exit $$status

run: dev ## Alias for dev

backend: ## Run only the backend development server
	cd $(BACKEND_DIR) && $(UV) run uvicorn app.main:app --reload --host $(HOST) --port $(BACKEND_PORT)

frontend: ## Run only the frontend development server
	cd $(FRONTEND_DIR) && $(NPM) run dev -- --host $(HOST) --port $(FRONTEND_PORT)

test: backend-test frontend-test ## Run all tests

backend-test: ## Run backend tests
	cd $(BACKEND_DIR) && $(UV) run pytest

frontend-test: ## Run frontend tests
	cd $(FRONTEND_DIR) && $(NPM) test

lint: ## Lint the frontend
	cd $(FRONTEND_DIR) && $(NPM) run lint

format: ## Format the frontend
	cd $(FRONTEND_DIR) && $(NPM) run format

build: ## Build the frontend for production
	cd $(FRONTEND_DIR) && $(NPM) run build

check: lint test build ## Run linting, tests, and the production build
