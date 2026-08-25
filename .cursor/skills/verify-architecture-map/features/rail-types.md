# Rail Types

## Sub-features

- Types module button under The contract
- Atomic transition from an active flow back to the city
- Types building and district selection
- Types title, measurements, prose, stack, and source path in the panel
- Flow button deactivation

## How to get to it

Open <http://127.0.0.1:5197>, click Play a flow, then click Types under The
contract without pressing Escape or Clear first.

## Driving it with the harness

```bash
node .cursor/skills/verify-architecture-map/helpers/drive.mjs rail-types
```

The driver starts the flow, clicks the rail button with id `am-rail-types`, and
checks that the city footer and district SVG return. It also checks that Play a
flow is inactive, Types is active, and the panel title is Types. It writes:

- `/opt/cursor/artifacts/verify-architecture-map/rail-types.png`
- `/opt/cursor/artifacts/verify-architecture-map/rail-types.console.txt`

## Gotchas

- A rail module click must clear `activeFlowId`. Otherwise the panel can show
  Types while the canvas and packet remain on the sequence.
- Clicking a participant on the sequence canvas is different. That inspection
  must keep the flow active.
- The Types count and line total come from raw source imports. They can change
  when `assets/core/types.ts` changes.
