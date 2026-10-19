#!/usr/bin/env bash
set -euo pipefail

# Cloud Agent: Docker is not in the base image; start daemon if missing.
if ! command -v docker >/dev/null 2>&1; then
  echo "[start-docker] docker CLI not installed — skipping."
  exit 0
fi

if ! sudo docker info >/dev/null 2>&1; then
  tmux -f /exec-daemon/tmux.portal.conf has-session -t dockerd 2>/dev/null ||
    tmux -f /exec-daemon/tmux.portal.conf new-session -d -s dockerd "sudo dockerd --storage-driver=vfs"
  for _ in $(seq 1 30); do
    sudo docker info >/dev/null 2>&1 && break
    sleep 1
  done
fi

COMPOSE_FILES=(-f docker-compose.yml)
if [[ -f docker-compose.cloud-agent.yml ]]; then
  COMPOSE_FILES+=(-f docker-compose.cloud-agent.yml)
fi

cd /workspace
if ! sudo docker compose "${COMPOSE_FILES[@]}" ps --status running 2>/dev/null | grep -q app; then
  FORCE_SEED="${FORCE_SEED:-0}" sudo docker compose "${COMPOSE_FILES[@]}" up -d --build
fi
