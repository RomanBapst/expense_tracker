#!/bin/bash
#
# logs.sh — tail docker compose logs from the production server.
#
# Usage:
#   ./logs.sh                # follow logs from all services
#   ./logs.sh server         # follow logs from just the "server" (backend) service
#   ./logs.sh server 200     # last 200 lines from "server", then follow
#
set -euo pipefail

# --- Config -----------------------------------------------------------------
REMOTE_HOST="root@81.16.28.216"
REMOTE_DIR="/home/production/expense_tracker"
COMPOSE_FILE="docker-compose.yaml"
# ----------------------------------------------------------------------------

SERVICE="${1:-}"
TAIL="${2:-100}"

ssh -t "$REMOTE_HOST" \
  "cd '${REMOTE_DIR}' && docker compose -f '${COMPOSE_FILE}' logs -f --tail=${TAIL} ${SERVICE}"
