# City browse

## Sub-features

- Four district plates and flags: The contract, The floor, The narration, The stage
- Isometric building glyphs for the mapped modules
- City edges under the buildings
- Repository, flow, module, path, and unmapped counts
- City interaction hint in the footer

## How to get to it

Open <http://127.0.0.1:5197>. The city is the initial view. If a flow or module
is selected, press Escape or click Clear.

## Driving it with the harness

```bash
node .cursor/skills/verify-architecture-map/helpers/drive.mjs city-browse
```

The driver checks the city footer, all four district names inside the SVG, at
least ten building buttons, and browser errors. It writes:

- `/opt/cursor/artifacts/verify-architecture-map/city-browse.png`
- `/opt/cursor/artifacts/verify-architecture-map/city-browse.console.txt`

## Gotchas

- District names also appear in the left rail. Check the SVG text, not the page
  text, when deciding whether the city is rendered.
- A selected module is still a city view. A selected flow is not.
- Camera fitting can change building positions when measured source sizes
  change. Verify structure and labels instead of exact pixels.
