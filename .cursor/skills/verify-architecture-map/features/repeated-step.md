# Repeated step

## Sub-features

- Distinct drawn identity for two occurrences of one authored edge
- One current message line and one current panel row
- Hover emphasis on only the pointed occurrence
- Number badges at each message's arc-length midpoint

## How to get to it

This is a verification-only graph variant. The driver loads the normal
playground, changes the existing Play a flow route to two occurrences of
`rail-view` in browser memory, and starts that flow. It does not add a product
flow or modify the authored graph.

## Driving it with the harness

```bash
node .cursor/skills/verify-architecture-map/helpers/drive.mjs repeated-step
```

The driver waits for the first travel beat, hovers the second message, and
checks line identity, panel identity, and badge geometry. It writes:

- `/opt/cursor/artifacts/verify-architecture-map/repeated-step.png`
- `/opt/cursor/artifacts/verify-architecture-map/repeated-step.console.txt`

## Gotchas

- The authored playground has no repeated edge within one flow. Keep the
  repeated route inside the browser run.
- Authored edge ids identify prose. Tagged ids such as `0::rail-view` identify
  one drawn occurrence.
- The first beat dwells for 1600 ms. Check current state after travel starts.
