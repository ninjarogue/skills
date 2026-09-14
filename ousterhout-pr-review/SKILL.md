---
name: ousterhout-pr-review
description: >-
  Use when reviewing an agent-written PR and the human bottleneck is
  understanding the codebase — short intent+shape+proof review (Ousterhout
  lens), not reading the whole diff.
---
# Ousterhout PR review (low reading)

Use when humans review agent-written PRs and the bottleneck is staying in touch with the codebase — not rubber-stamping, not reading every line.

Goal: **judgment + proof in 10–15 minutes.** Skip volume reading.

## Before opening the diff
1. Read only Why / Scope / Blast radius (or equivalent PR body). If missing, request them; do not start in the code.
2. Skim the **file list** only: which modules grew or appeared? Flag new pass-through wrappers.
3. Confirm the PR is **one design decision**. If it mixes concerns, send it back to split — do not review a multi-decision PR line-by-line.

## Four design checks (Ousterhout lens)
Ask these; do not narrate the whole diff:
1. **Deeper or shallower?** Does the change hide complexity behind a simpler interface, or expose more knobs/call sites?
2. **Information leak?** Is one design decision now duplicated across files?
3. **Special cases?** Did exceptions/branches proliferate instead of a cleaner abstraction?
4. **Right module?** Could this belong inside an existing deep module instead of a new shallow layer?

## Proof over reading
1. Prefer a short prove-it path (tests, harness, smoke, motion clip) over exhaustive reading.
2. Spot-check only the **risky spine**: boundaries, state, delete/error paths, shared APIs.
3. Treat automated/agent review comments as hints (like linters) — not as human approval.

## Ownership split
- **Agents / automation:** nits, lint, formatting, known security patterns, coverage gates.
- **Human:** intent fit, architecture fit, blast radius, “does this belong?”

## After merge (keep touch without reading)
Write one mental (or logged) sentence: “X now hides Y behind Z.” That is the continuity habit.

## Anti-patterns
- Reading the full diff “to stay in touch”
- Approving because CI is green
- Mixing design debate into a ready-to-merge nit PR
- Asking the human to re-derive the agent’s entire implementation from the patch

## Output shape (when reporting a review)
Keep it short:
- **Verdict:** APPROVE / REQUEST-CHANGES / HOLD
- **Intent:** one line
- **Design:** pass/fail on the four checks (only call out fails)
- **Proof:** what ran (or what is missing)
- **Blockers:** only real ones
