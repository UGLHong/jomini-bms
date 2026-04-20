---
description: Orchestrator pattern for non-trivial tasks \u2014 Discover, Plan, Execute
globs:
alwaysApply: true
---

# Agent Orchestrator Pattern

## Core Principle

Every non-trivial task follows three explicit phases: **Discover → Plan → Execute**. Each phase may spawn parallel sub-agents. The orchestrating agent coordinates, synthesises, and verifies — it does not do all the work itself. Never skip or collapse phases.

---

## Phase 1 — Discover

Build a complete picture of the current state before making any decisions.

- Read all files relevant to the request
- Check the project's documentation folder first (see `docs-first.md`)
- Map data flow end-to-end, identify existing patterns, conventions, and constraints
- Resolve all unknowns that would block planning

**Spawn parallel Discover sub-agents** when exploration spans multiple isolated areas (e.g. one agent for backend, one for frontend, one for docs, one for infra). Each sub-agent returns: files read, key types/interfaces, patterns to follow, constraints found.

**Discover is complete when** no open questions remain and the plan can be written without reading more files.

---

## Phase 2 — Plan

Produce a concrete, dependency-ordered execution plan that sub-agents can follow without ambiguity.

- List every deliverable (file to create / modify / delete, migration, doc, config change)
- Map dependencies — which are free-standing, which depend on others
- Group free deliverables into parallel stages
- Define all shared types, schemas, and API contracts upfront — put them in the project's shared types/schemas location so both sides of the plan consume the same definitions
- Write a handoff spec for each execution sub-agent

**Plan output format:**

```
Deliverables table: # | File | Action | Depends on
Execution stages:   Stage 1 (parallel): #1, #2 / Stage 2 (parallel, after Stage 1): #3, #4
Shared contracts:   type definitions and API shapes every agent must conform to
```

**Spawn parallel Plan sub-agents** for large requests: one plans backend, one plans frontend, one plans cross-cutting concerns. The orchestrator merges and resolves cross-agent dependencies.

**Plan is complete when** every deliverable is listed, every dependency is explicit, and no execution agent will need to make a design decision on its own.

---

## Phase 3 — Execute

Implement the plan with maximum parallelism within dependency constraints.

- Spawn one execution sub-agent per stage batch
- Each agent receives a handoff spec (Goal, Scope, Shared Contracts, Do Not Touch, Constraints, Return)
- Orchestrator waits for each stage before starting the next
- Agents in the same stage must not write to overlapping files

**Execution agent handoff template:**

```
PHASE: Execute
GOAL: [one sentence]
SCOPE (only touch these): [full file paths with create | modify | delete]
SHARED CONTRACTS: [types/interfaces/schemas the agent must conform to]
DO NOT TOUCH: [files outside scope]
CONSTRAINTS: [naming, error handling, import patterns; follow .agent/rules/general.md]
RETURN: files created/modified, type errors encountered, plan deviations with justification
```

**After all stages:** orchestrator spot-checks key output files, verifies integration points, follows `local-verification.md`, and writes/updates the relevant feature doc per `documentation.md`.

---

## When to Use This Pattern

| Situation | Action |
| --- | --- |
| Single file, < 10 lines | Inline — no sub-agents |
| 2–3 files, same area | Inline sequential tool calls |
| 4+ files, 2+ feature areas | Orchestrator pattern (Plan + Execute minimum) |
| Ambiguous request or unknown area | All three phases — Discover is mandatory |
| 3+ independent deliverables | Parallel execution sub-agents mandatory |
| More than 10 files read before any write | Stop — spawn sub-agents for remaining work |

---

## Context Budget

- Discover agents return summaries, not raw file contents — protect orchestrator context
- Execution agents return outcomes, not diffs
- Orchestrator context holds: the plan, shared contracts, coordination state, final verification

---

## Related Rules

- `docs-first.md` — Discover phase always starts with the documentation folder
- `documentation.md` — every feature execution must produce or update a feature doc
- `local-verification.md` — orchestrator runs final verification after Execute completes
- `general.md` — every execution agent must follow the general coding conventions
