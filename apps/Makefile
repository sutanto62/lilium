.PHONY: init clean db-create db-delete

UUID_PATH=$(shell sqlpkg which nalgeon/uuid)

init:
	@echo "🚀 Initializing project..."
	@command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed. Aborting."; exit 1; }
	@command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed. Aborting."; exit 1; }
	@npm install || { echo "❌ npm install failed"; exit 1; }
	@curl -sSf https://webi.sh/sqlpkg | sh || { echo "❌ sqlpkg installation failed"; exit 1; }
	@source ~/.config/envman/PATH.env
	@echo "📦 Dependencies installed successfully"
	@sqlpkg install nalgeon/uuid || { echo "❌ uuid extension install failed"; exit 1; }
	@echo "✅ Project initialized successfully!"

clean:
	@echo "🧹 Cleaning project..."
	@rm -rf ./node_modules 2>/dev/null || true
	@rm -rf ./.svelte-kit 2>/dev/null || true
	@rm -rf ./build 2>/dev/null || true
	@rm -rf ./package-lock.json 2>/dev/null || true
	@rm -rf ./tests-results 2>/dev/null || true
	@rm -rf ./coverage 2>/dev/null || true
	@npm cache clean --force 2>/dev/null || true
	@echo "✅ Clean completed!"

clean-cache:
	@echo "🧹 Cleaning cache..."
	@rm -rf ./node_modules/.cache 2>/dev/null || true
	@rm -rf ./node_modules/.vite 2>/dev/null || true
	@rm -rf ./.svelte-kit/cache 2>/dev/null || true
	@rm -rf ./.svelte-kit/tmp 2>/dev/null || true
	@echo "✅ Cache cleaned!"

db-create:
	@echo "⏳ Creating database..."
	@echo "UUID_PATH: $(UUID_PATH)"
	@mkdir -p db
	@sqlite3 db/lilium.db "PRAGMA journal_mode=WAL; \
	PRAGMA synchronous=NORMAL; \
	PRAGMA temp_store=MEMORY; \
	PRAGMA mmap_size=30000000000;"
	@npm run db:generate
	@npm run db:migrate
	@echo "✅ Database created! \
	Open sqlite3 db/lilium.db and run .load $(UUID_PATH)"

db-migrate:
	@echo "⏳ Migrating database..."
	@npx drizzle-kit migrate
	@echo "✅ Database migrated!"

# Delete database and all migrations
db-delete:
	@echo "🧹 Deleting database..."
	@rm -rf db 2>/dev/null || true
	@rm -rf drizzle 2>/dev/null || true
	@echo "✅ Database and migrations deleted!"
