#!/usr/bin/env bash
set -euo pipefail
cd /var/www/crm

# export all vars from .env.production (and .env.local if present)
set -a
[ -f .env.production ] && . ./.env.production
[ -f .env.local ] && . ./.env.local
set +a

# ensure prod and bind to localhost
export NODE_ENV=production
export HOST=127.0.0.1
export PORT=3000

exec npx next start -p 3000 -H 127.0.0.1
