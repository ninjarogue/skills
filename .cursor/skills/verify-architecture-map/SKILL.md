---
name: verify-architecture-map
description: Verify the architecture-map playground city, sequence flows, and rail selection behavior with its local Vite app and a dependency-free Chrome CDP driver.
---

# Verify architecture-map

Use this skill for changes under `architecture-map/assets/` or
`architecture-map/playground/`. Run from the repository root.

## Launch

```bash
bash .cursor/skills/verify-architecture-map/helpers/launch.sh
```

This installs the locked playground dependencies and starts Vite in the tmux
session `verify-architecture-map` at <http://127.0.0.1:5197>. The helper passes
`--strictPort`; it will fail instead of attaching to another app.

If launch fails, run Cleanup before retrying. Do not start a second copy on
another port until the first session is gone.

## Doctor

```bash
bash .cursor/skills/verify-architecture-map/helpers/doctor.sh
```

Doctor checks Node, npm, curl, Chrome, tmux, the lockfile, the named tmux
session, and the Vite response. Continue only when it prints `RESULT=PASS`.

For a failed server check, inspect the owned session:

```bash
tmux -f /exec-daemon/tmux.portal.conf capture-pane \
  -t verify-architecture-map:0.0 -p
```

If `/exec-daemon/tmux.portal.conf` does not exist, run the same command without
`-f /exec-daemon/tmux.portal.conf`.

## Drive

The repository has no Playwright or Cypress harness. Use the bundled CDP driver:

```bash
node .cursor/skills/verify-architecture-map/helpers/drive.mjs city-browse
node .cursor/skills/verify-architecture-map/helpers/drive.mjs play-a-flow
node .cursor/skills/verify-architecture-map/helpers/drive.mjs rail-types
node .cursor/skills/verify-architecture-map/helpers/drive.mjs repeated-step
```

Each invocation starts an isolated headless Chrome with a dynamic debugging
port, drives one feature, checks the DOM and console, captures evidence, and
stops that Chrome process. A passing run ends with `RESULT=PASS`.

Read the matching file under `features/` before driving a feature.

## Evidence

Evidence is stable across Cleanup:

| Feature | Screenshot | Console and assertions |
|---|---|---|
| City browse | `/opt/cursor/artifacts/verify-architecture-map/city-browse.png` | `/opt/cursor/artifacts/verify-architecture-map/city-browse.console.txt` |
| Play a flow | `/opt/cursor/artifacts/verify-architecture-map/play-a-flow.png` | `/opt/cursor/artifacts/verify-architecture-map/play-a-flow.console.txt` |
| Rail Types | `/opt/cursor/artifacts/verify-architecture-map/rail-types.png` | `/opt/cursor/artifacts/verify-architecture-map/rail-types.console.txt` |
| Repeated step | `/opt/cursor/artifacts/verify-architecture-map/repeated-step.png` | `/opt/cursor/artifacts/verify-architecture-map/repeated-step.console.txt` |

Open the PNG and read the console file before reporting success. The console
file records every assertion, browser console entry, network failure, and final
result.

## Cleanup

Run Cleanup after success, after failure, and before every retry:

```bash
bash .cursor/skills/verify-architecture-map/helpers/cleanup.sh
```

Cleanup stops only the `verify-architecture-map` tmux session and Chrome
profiles whose names start with `verify-architecture-map-chrome-`. It does not
delete `/opt/cursor/artifacts/verify-architecture-map`.

Confirm the evidence you plan to cite still exists:

```bash
test -s /opt/cursor/artifacts/verify-architecture-map/play-a-flow.png
test -s /opt/cursor/artifacts/verify-architecture-map/play-a-flow.console.txt
```

## Helpers

| Helper | Purpose |
|---|---|
| `helpers/launch.sh` | Install dependencies and own the Vite process |
| `helpers/doctor.sh` | Check tools, process ownership, and HTTP health |
| `helpers/drive.mjs` | Drive Chrome through CDP and write evidence |
| `helpers/cleanup.sh` | Stop owned processes and preserve evidence |

When the playground UI, labels, launch command, or feature set changes, use
`/maintain-verification-skill` to update this skill. Do not patch around stale
selectors in a verification run.
