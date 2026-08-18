# skills

Claude Code skills.

| Skill | What it does |
|---|---|
| [architecture-map](architecture-map/) | Builds an interactive isometric map of a repository — buildings sized by real measurements, flows tracing real call paths, and a drift counter that fails CI when the map falls behind the code. |

## Installing

Symlink or copy a skill into `~/.claude/skills/`:

```bash
ln -s "$PWD/architecture-map" ~/.claude/skills/architecture-map
```

Then invoke it by name: `/architecture-map`.
