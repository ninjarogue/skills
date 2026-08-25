# Play a flow

## Sub-features

- Building-shaped participants across the top
- One vertical lifeline per participant
- Authored messages ordered downward
- Numbered steps and the moving accent packet
- Play, pause, and speed controls
- Sequence interaction hint in the footer

## How to get to it

Open <http://127.0.0.1:5197> and click Play a flow in the Flows section of the
left rail.

## Driving it with the harness

```bash
node .cursor/skills/verify-architecture-map/helpers/drive.mjs play-a-flow
```

The driver selects Play a flow, waits until the first travel beat, and checks
that the sequence replaced the district SVG. It checks participants, lifelines,
the active flow button, and two distinct packet positions. It writes:

- `/opt/cursor/artifacts/verify-architecture-map/play-a-flow.png`
- `/opt/cursor/artifacts/verify-architecture-map/play-a-flow.console.txt`

## Gotchas

- The program dwells at the first participant before the packet travels. A
  packet check made immediately after clicking can mistake a dwell for a stall.
- Group names remain visible in the rail. Their presence on the page does not
  mean the city remains behind the sequence.
- `prefers-reduced-motion` stops autoplay. The bundled headless Chrome uses its
  default motion setting; a manually configured browser may not.
- Escape leaves the sequence and returns to the city.
