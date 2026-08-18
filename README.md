# skills

Agent skills — portable instruction packs in the `SKILL.md` format, usable by
any harness that reads it (Claude Code, Codex, Cursor, Gemini CLI, and others).

| Skill | What it does |
|---|---|
| [architecture-map](architecture-map/) | Builds an interactive isometric map of a repository — buildings sized by real measurements, flows tracing real call paths, and a drift counter that fails CI when the map falls behind the code. |

## Installing

Skills are discovered from a directory your tool scans. Symlink rather than
copy, so `git pull` here updates every install at once:

```bash
# Claude Code (global, all projects)
ln -s "$PWD/architecture-map" ~/.claude/skills/architecture-map

# Codex
ln -s "$PWD/architecture-map" ~/.codex/skills/architecture-map

# Tools using the shared convention
ln -s "$PWD/architecture-map" ~/.agents/skills/architecture-map

# Scoped to one project, whatever the tool
ln -s "$PWD/architecture-map" /path/to/repo/.claude/skills/architecture-map
```

Create the target directory first if it does not exist. Skills load when a
session starts, so open a new one afterwards.

## What is in a skill

- `SKILL.md` — YAML frontmatter (`name`, `description`) plus the instructions.
  The description is what decides when the skill fires, so it names the
  situations rather than describing the feature.
- `references/` — detail loaded only when needed, keeping `SKILL.md` scannable.
- `scripts/` — executables the skill runs. They live beside `SKILL.md`, not in
  the repo being worked on, so skills resolve their own directory before
  calling them.
- `assets/` — files copied into the target project.

## Portability

Nothing here depends on a specific harness. Where a skill wants a structured
question it names one tool's mechanism as an example and gives a plain-text
fallback; where it needs its own directory it resolves the path rather than
reading a tool-specific environment variable.
