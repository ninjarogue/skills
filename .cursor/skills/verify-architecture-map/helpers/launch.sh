#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
APP_DIR="$ROOT/architecture-map/playground"
SESSION="verify-architecture-map"
URL="http://127.0.0.1:5197"

if [[ -f /exec-daemon/tmux.portal.conf ]]; then
  TMUX=(tmux -f /exec-daemon/tmux.portal.conf)
else
  TMUX=(tmux)
fi

cd "$APP_DIR"
npm ci

if "${TMUX[@]}" has-session -t "=$SESSION" 2>/dev/null; then
  if curl --fail --silent "$URL" >/dev/null; then
    echo "server=already-running url=$URL session=$SESSION"
    exit 0
  fi
  "${TMUX[@]}" kill-session -t "$SESSION"
fi

"${TMUX[@]}" new-session -d -s "$SESSION" -c "$APP_DIR" -- "${SHELL:-bash}" -l
"${TMUX[@]}" send-keys -t "$SESSION:0.0" \
  'npm run dev -- --host 127.0.0.1 --port 5197 --strictPort' C-m

for _ in {1..50}; do
  if curl --fail --silent "$URL" >/dev/null; then
    echo "server=started url=$URL session=$SESSION"
    exit 0
  fi
  sleep 0.2
done

"${TMUX[@]}" capture-pane -t "$SESSION:0.0" -p
"${TMUX[@]}" kill-session -t "$SESSION"
echo "server=failed url=$URL session=$SESSION" >&2
exit 1
