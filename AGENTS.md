# AI Agent Instructions

> **STOP.** If you are about to start a task without completing the mandatory boot sequence below, go back and complete it first. The rules in `.agent/rules/` are **not optional**, and many of them may not auto-load into your context.

This file is the entry point for any AI coding agent (Cursor, Claude Code, Codex, Windsurf, Cline, etc.) working in this repository. It intentionally stays stack-agnostic — project-specific conventions live in `.agent/rules/` and `/docs`.

---

## Mandatory Agent Boot Sequence

Before reading the user's task, writing any code, or calling any other tool, perform these steps in order. Skipping a step is a rule violation, not an optimisation.

1. **Read every file in `.agent/rules/`.** Do not infer contents from filenames. Use your file-read tool on each one.
2. **List the project's documentation folder** (commonly `/docs`, `/documentation`, or the root `README.md`). Identify files whose topic plausibly overlaps the task.
3. **Read every documentation file whose topic plausibly overlaps the task.** Prefer over-reading. The cost of reading a doc is trivial compared to re-implementing a feature incorrectly.
4. Only now proceed to the task.

### Self-check before first tool call on the task itself

Ask yourself:

- [ ] Have I read every file in `.agent/rules/` in this session?
- [ ] Have I listed the project's documentation folder?
- [ ] Have I read every doc whose name relates to the task?
- [ ] Do I understand the user's goal, success criteria, and constraints?

If any answer is "no", go back and do it now.

---

## Mandatory Task Completion Checklist

Before marking any task complete:

- [ ] Implementation works and has been verified per `.agent/rules/local-verification.md`
- [ ] Documentation reflects the change per `.agent/rules/documentation.md` — new feature → new doc; modified feature → update existing doc + append to its `## Changelog`
- [ ] File paths mentioned in docs are exact and correct
- [ ] No new lint, type, or build errors introduced
- [ ] No unrelated code touched
- [ ] The change is within the scope of the user's request

If documentation was skipped on a change that requires it, **the task is not complete**, even if the code works.

---

## Quick-Reference Rule TL;DR

This section is an emergency fallback if you somehow cannot read the `.agent/rules/` files. It is **not a substitute** for reading them in full at session start.

### Docs-First (`.agent/rules/docs-first.md`)

- The project's documentation folder is the source of truth for feature specs, architecture, and flows
- List the docs folder and read anything relevant **before** writing code
- Match by topic, not by exact keyword — read the doc even if the user never used the exact word

### Documentation (`.agent/rules/documentation.md`)

- Writing or updating documentation is a **required deliverable**, not optional, not deferrable
- Every feature doc has required sections: `## Overview`, `## Flow`, `## Key Files`, `## Data Shape`, `## Status Codes / Enums`, `## Constraints & Edge Cases`, `## Related Docs`, `## Changelog` (on updates)
- File naming: `SCREAMING_SNAKE_CASE.md` scoped to the feature domain (not `BUTTON_COLOR_FIX.md`)
- Write for AI consumption: tables over prose, exact file paths, define every enum, state the "why"
- **Update existing docs** when modifying an existing feature — do not create a second doc for the same feature

### General (`.agent/rules/general.md`)

- Follow the project's established naming, import, and file-layout conventions — discover them before writing code
- Reuse existing components, utilities, helpers, and constants before creating new ones
- Use path aliases from `tsconfig.json` / `jsconfig.json` instead of relative paths when TypeScript/JavaScript
- Do not add comments that narrate code — only explain non-obvious intent
- Do not touch code unrelated to the request

### Local Verification (`.agent/rules/local-verification.md`)

- Every change must be exercised locally before being marked complete
- Start the project's dev server / test runner / script and reproduce the change
- Watch logs (browser console, server terminal, test output) for errors; fix and re-verify

### Parallel Subtasks (`.agent/rules/parallel-subtasks.md`)

- For non-trivial work, follow **Discover → Plan → Execute**
- Spawn parallel sub-agents for independent discovery or execution steps where the platform supports it
- The orchestrator coordinates and verifies; sub-agents return summaries, not raw files

---

## Project-Specific Configuration

The following sections are placeholders — fill them in for this repository so future agents (and humans) have a reliable anchor. If a section does not apply, delete it.

### Project Layout Reference

| Directory | Purpose |
| --- | --- |
| `.agent/rules/` | **Source of truth for agent rules — read at session start** |
| `.agent/skills/` | Agent Skills (e.g. commit, pr, reflect-skills) |
| `docs/` *(or equivalent)* | **Source of truth for feature specs — read before coding** |
| *(add project directories here)* | *(describe their purpose)* |

### Common Commands

Fill in the project's actual commands (detect from `package.json`, `Makefile`, `pyproject.toml`, `Cargo.toml`, etc.) before relying on them:

```bash
# examples — replace with the real commands for this project
<pkg-manager> dev          # start dev server
<pkg-manager> build        # production build
<pkg-manager> test         # run tests
<pkg-manager> lint         # run linter
<pkg-manager> typecheck    # run type checker
```

### Tooling Notes

- Package manager: *(e.g. pnpm / npm / yarn / bun / poetry / uv / cargo)*
- Runtime / framework: *(e.g. Node 20 / Bun / Deno / Python 3.12 / Go 1.22)*
- Primary language(s): *(e.g. TypeScript, Python, Go, Rust)*
- Notable conventions: *(e.g. auto-imports, path aliases, migration workflow)*

---

## Editor / Agent Compatibility

This instruction set is designed to be portable across agents:

- **Cursor** reads `AGENTS.md` at repo root and every file in `.cursor/rules/`. Symlink `.cursor/rules` → `.agent/rules` (or copy on save) so both surfaces share one source of truth.
- **Claude Code** reads `AGENTS.md` and `CLAUDE.md` at repo root. You can symlink `CLAUDE.md` → `AGENTS.md`.
- **GitHub Copilot / Codex** reads `AGENTS.md` and `.github/copilot-instructions.md`. Symlink or mirror as needed.
- **Windsurf / Cline / Continue** read `AGENTS.md` and their own rule files — link them to `.agent/rules/` where supported.

Keeping `.agent/rules/` as the canonical source with symlinks outward means you edit once and every agent picks up the change.

---

## If You Are Unsure

- Unsure what a feature does → list the docs folder and read
- Unsure about a coding convention → read the relevant file in `.agent/rules/`
- Unsure about an existing component, utility, or helper → search the codebase before creating a new one
- Unsure whether docs are required → if in doubt, write docs; the cost of an unnecessary doc is low, the cost of missing docs is high
- Unsure about user intent → stop and ask, do not guess
