# ControlKit — common dev commands
# Run `make` (or `make help`) with no target for the list.

BACKEND := backend
PORTAL  := portal

.PHONY: help up down db backend portal migrate seed reset status install psql

help:
	@echo ""
	@echo "  ControlKit — dev commands"
	@echo "  -----------------------------------------------------------"
	@echo "  make up         Start Postgres + backend + portal (new Terminal windows)"
	@echo "  make down       Stop backend, portal and Postgres"
	@echo "  make status     Show what's running on :5432 / :4000 / :5173"
	@echo ""
	@echo "  make db         Start Postgres only"
	@echo "  make backend    Run backend in THIS terminal (blocks)"
	@echo "  make portal     Run portal in THIS terminal (blocks)"
	@echo ""
	@echo "  make install    npm install in backend/ and portal/"
	@echo "  make migrate    Apply SQL migrations"
	@echo "  make seed       Seed demo project + API keys + flags/config"
	@echo "  make reset      Drop DB, recreate, migrate, seed"
	@echo "  make psql       Open psql against the controlkit DB"
	@echo ""

# ---- one-shot "start everything" ----
up: db
	@osascript -e 'tell application "Terminal" to do script "cd $(CURDIR)/$(BACKEND) && npm run dev"' >/dev/null
	@osascript -e 'tell application "Terminal" to do script "cd $(CURDIR)/$(PORTAL)  && npm run dev"' >/dev/null
	@echo ""
	@echo "  ControlKit starting…"
	@echo "    Backend → http://localhost:4000  (new Terminal window)"
	@echo "    Portal  → http://localhost:5173  (new Terminal window)"
	@echo ""
	@echo "  Run 'make status' in a few seconds to verify."

down:
	-@pkill -f "nodemon src/index.js" 2>/dev/null && echo "Backend stopped." || echo "Backend not running."
	-@pkill -f "vite"                 2>/dev/null && echo "Portal stopped."  || echo "Portal not running."
	@brew services stop postgresql@14 >/dev/null 2>&1 && echo "Postgres stopped." || echo "Postgres not running."

status:
	@printf "  Postgres :5432  → "; pg_isready -h localhost -p 5432 2>/dev/null || true
	@printf "  Backend  :4000  → "; \
		code=$$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health 2>/dev/null); \
		if [ "$$code" = "200" ]; then echo "up (HTTP $$code)"; else echo "down"; fi
	@printf "  Portal   :5173  → "; \
		code=$$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173 2>/dev/null); \
		if [ "$$code" = "200" ]; then echo "up (HTTP $$code)"; else echo "down"; fi

# ---- individual services ----
db:
	@brew services start postgresql@14 >/dev/null 2>&1 || true
	@until pg_isready -h localhost -p 5432 >/dev/null 2>&1; do sleep 0.3; done
	@echo "Postgres ready."

backend:
	cd $(BACKEND) && npm run dev

portal:
	cd $(PORTAL) && npm run dev

# ---- DB lifecycle ----
install:
	cd $(BACKEND) && npm install
	cd $(PORTAL)  && npm install

migrate:
	cd $(BACKEND) && npm run migrate

seed:
	cd $(BACKEND) && npm run seed

reset:
	@echo "Dropping and recreating the controlkit database…"
	-dropdb --if-exists controlkit
	createdb controlkit
	cd $(BACKEND) && npm run migrate && npm run seed

psql:
	psql controlkit
