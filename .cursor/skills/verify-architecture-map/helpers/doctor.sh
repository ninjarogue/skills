#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
APP_DIR="$ROOT/architecture-map/playground"
SESSION="verify-architecture-map"
URL="http://127.0.0.1:5197"
FAILED=0

check_command() {
  if command -v "$1" >/dev/null; then
    echo "$1=pass"
  else
    echo "$1=fail"
    FAILED=1
  fi
}

check_command node
check_command npm
check_command curl
check_command google-chrome
check_command tmux

if [[ -f "$APP_DIR/package-lock.json" ]]; then
  echo "package-lock=pass"
else
  echo "package-lock=fail"
  FAILED=1
fi

if [[ -f /exec-daemon/tmux.portal.conf ]]; then
  TMUX=(tmux -f /exec-daemon/tmux.portal.conf)
else
  TMUX=(tmux)
fi

if "${TMUX[@]}" has-session -t "=$SESSION" 2>/dev/null; then
  echo "session=pass"
else
  echo "session=fail"
  FAILED=1
fi

if curl --fail --silent "$URL" | rg --quiet "architecture-map playground"; then
  echo "http=pass url=$URL"
else
  echo "http=fail url=$URL"
  FAILED=1
fi

if [[ "$FAILED" -eq 0 ]]; then
  echo "RESULT=PASS"
else
  echo "RESULT=FAIL"
  exit 1
fi
