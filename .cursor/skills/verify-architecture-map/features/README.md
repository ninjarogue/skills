# Architecture-map verification features

The playground has three mapped verification features:

| Feature | File | Driver argument |
|---|---|---|
| City browse | [`city-browse.md`](city-browse.md) | `city-browse` |
| Play a flow | [`play-a-flow.md`](play-a-flow.md) | `play-a-flow` |
| Rail Types | [`rail-types.md`](rail-types.md) | `rail-types` |
| Repeated step | [`repeated-step.md`](repeated-step.md) | `repeated-step` |

Run Launch and Doctor from `../SKILL.md` first. Drive only the feature needed
for the change unless the change crosses city, flow, and rail behavior.

Every feature writes a screenshot and a console transcript under
`/opt/cursor/artifacts/verify-architecture-map`. Cleanup preserves those files.
