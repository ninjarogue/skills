#!/usr/bin/env bash
set -euo pipefail

SESSION="verify-architecture-map"
EVIDENCE_DIR="/opt/cursor/artifacts/verify-architecture-map"

if [[ -f /exec-daemon/tmux.portal.conf ]]; then
  TMUX=(tmux -f /exec-daemon/tmux.portal.conf)
else
  TMUX=(tmux)
fi

if "${TMUX[@]}" has-session -t "=$SESSION" 2>/dev/null; then
  "${TMUX[@]}" kill-session -t "$SESSION"
fi

pkill -f -- '--user-data-dir=/tmp/verify-architecture-map-chrome-' 2>/dev/null || true
rm -rf /tmp/verify-architecture-map-chrome-*

echo "server=stopped session=$SESSION"
if [[ -d "$EVIDENCE_DIR" ]]; then
  echo "evidence=preserved path=$EVIDENCE_DIR"
else
  echo "evidence=none path=$EVIDENCE_DIR"
fi
