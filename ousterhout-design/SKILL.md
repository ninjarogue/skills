---
name: ousterhout-design
description: >-
  Use when designing or locking architecture before/during implementation —
  fight complexity with deep modules (not the PR-review lens; that is
  ousterhout-pr-review).
---
# Ousterhout design (pure software design)

Use **before and during** implementation and architecture lock — not as a full-diff PR review.

For agent-written PR judgment in 10–15 minutes, use [ousterhout-pr-review](../ousterhout-pr-review/) instead.

## Goal

Fight complexity: **eliminate it or hide it**. Prefer **deep modules** (small interface, large benefit).

Complexity shows up as:
- **Change amplification** — one idea edit touches many places
- **Cognitive load** — too much to hold to work safely
- **Unknown unknowns** — behavior you cannot predict without reading deep
- Drivers: **dependencies** between pieces + **obscurity** (non-obvious flow, names, contracts)

Invest ~10–20% of effort in **strategic** design. Do not patch around a bad shape (**tactical** thrash).

## When to use / not use

**Use when:**
- Choosing module boundaries, APIs, or layering
- A feature keeps sprouting special cases or shallow wrappers
- You are about to “just add a flag / helper / pass-through”
- Locking an interface before a larger implementation pass

**Do not use when:**
- You only need lint, formatting, or test greenness
- You are doing a short PR judgment pass → [ousterhout-pr-review](../ousterhout-pr-review/)
- Treating TDD increments as the design (tests guide features; they do not replace abstraction)

## Before writing code

1. **Design it twice** — sketch ≥2 interface shapes for the same job; pick the deeper one (harder to misuse, less leakage).
2. Write a **one-paragraph contract**: what the module hides, what callers may assume, what is out of scope.
3. **One decision per module** — if you need two sentences for “why this exists,” split or rethink.
4. Prefer a **somewhat general-purpose** interface; push one-off special cases **up** (caller) or **down** (deeper helper), not into the public surface.
5. If the contract is hard to write cleanly, the design is still too complex — simplify before coding.

## Module checklist

For each new or changed module, check:

| Check | Prefer | Avoid |
| --- | --- | --- |
| Depth | Small interface, large implementation value | Shallow: interface ≈ body |
| Hiding | One place owns a secret (format, policy, state machine) | Leakage: callers re-know internals |
| Layers | Each layer a real abstraction | Pass-through that only renames/forwards |
| Complexity direction | Pull complexity **down** (defaults, clamping, policy inside) | Push knobs and edge cases into every caller |
| Errors | **Define errors out of existence** (clamp, idempotent delete, empty result) | Mask quietly, or force every caller to recover/crash |
| Names / obviousness | Name matches behavior; control flow reads top-down | Vague names; surprising branches |
| Comments | Comment **design intent** and non-obvious invariants | Comment that restates code; put impl detail in the public docs |

**Temporal decomposition red flag:** splitting “steps in time” into separate modules that must stay in sync — prefer one module that owns the whole protocol when the steps share knowledge.

**Performance:** optimize after the deep shape is right; do not shallow-out an API for a guessed hot path.

**TDD caveat:** each green step should deepen an abstraction or clarify a contract — not only add a feature branch.

## Together vs apart

**Combine** when:
- Pieces share knowledge that would otherwise leak or duplicate
- One interface is simpler than two coordinated ones
- Joining kills copy-paste of the same decision

**Split** when:
- One part is general-purpose and another is a special case
- Lifetimes, failure modes, or callers diverge cleanly
- Keeping them together forces a bloated or conjoined API

**Conjoined methods red flag:** two operations that must always be called together (or in a fixed order) with shared sticky state — usually one operation belongs inside the other.

## Red-flag cheat list

Stop and redesign if you see:
- Shallow module (interface cost ≈ implementation benefit)
- Information leak (same decision encoded in multiple places)
- Temporal split of one protocol across modules
- Overexposed API (callers see knobs they should not need)
- Pass-through layer (no real abstraction)
- Repetition of the same logic/decision
- Special cases mixed into a general module
- Conjoined methods / mandatory call ordering across modules
- Comments that only repeat the code
- Implementation detail in the public interface docs
- Vague or misleading names
- Non-obvious control flow (hidden side effects, surprising returns)

## After

Write one continuity sentence:

> **X now hides Y behind Z.**

Example: “`ConfigLoader` now hides env+file merge behind a typed `Settings` value.”

If you cannot fill X / Y / Z, the module is probably still shallow or leaky.

## Out of scope

- Lint, formatting, style nits
- “Tests as design” theater without a real contract
- Full-diff PR review and merge judgment → [ousterhout-pr-review](../ousterhout-pr-review/)
