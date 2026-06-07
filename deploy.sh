#!/bin/bash
#
# deploy.sh — commit current branch, push to origin, and redeploy on the
# production server.
#
# Usage:
#   ./deploy.sh "commit message"
#   ./deploy.sh                  # will prompt for a commit message
#
set -euo pipefail

# --- Config -----------------------------------------------------------------
REMOTE_HOST="root@81.16.28.216"
REMOTE_DIR="/home/production/expense_tracker"
COMPOSE_FILE="docker-compose.yaml"
# ----------------------------------------------------------------------------

cd "$(dirname "$0")"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "==> Current branch: ${BRANCH}"

# --- 1. Commit (only if there is something to commit) -----------------------
if [[ -n "$(git status --porcelain)" ]]; then
  COMMIT_MSG="${1:-}"
  if [[ -z "$COMMIT_MSG" ]]; then
    read -r -p "Commit message: " COMMIT_MSG
  fi
  if [[ -z "$COMMIT_MSG" ]]; then
    echo "Aborting: empty commit message." >&2
    exit 1
  fi
  echo "==> Committing changes..."
  git add -A
  git commit -m "$COMMIT_MSG"
else
  echo "==> No local changes to commit, skipping commit."
fi

# --- 2. Push to origin ------------------------------------------------------
echo "==> Pushing ${BRANCH} to origin..."
git push -u origin "$BRANCH"

# --- 3. Redeploy on the production server -----------------------------------
echo "==> Deploying ${BRANCH} on ${REMOTE_HOST}:${REMOTE_DIR}..."
ssh "$REMOTE_HOST" bash -s -- "$REMOTE_DIR" "$BRANCH" "$COMPOSE_FILE" <<'REMOTE'
set -euo pipefail
REMOTE_DIR="$1"
BRANCH="$2"
COMPOSE_FILE="$3"

cd "$REMOTE_DIR"

echo "  -> Fetching latest from origin..."
git fetch origin --prune

echo "  -> Checking out ${BRANCH} (reset to origin/${BRANCH})..."
git checkout -B "$BRANCH" "origin/${BRANCH}"

echo "  -> Restarting docker containers..."
docker compose -f "$COMPOSE_FILE" up -d --build

echo "  -> Done. Running services:"
docker compose -f "$COMPOSE_FILE" ps
REMOTE

echo "==> Deployment complete."
