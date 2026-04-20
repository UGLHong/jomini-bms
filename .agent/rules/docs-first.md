---
description: Always check the project's documentation folder before starting any task
globs:
alwaysApply: true
---

# Docs-First Rule

## Hard Requirement

Before you implement, refactor, fix, or answer any non-trivial question about this codebase, **you must**:

1. List the project's documentation folder (commonly `/docs`, `/documentation`, or the root `README.md` plus any adjacent `*.md` files).
2. Read **every** doc whose name relates to the task — err on the side of over-reading.
3. Only then begin work.

This is not a "when it feels useful" guideline. It is a precondition. Skipping it causes regressions, duplicated work, and missed constraints.

---

## Why

A well-maintained docs folder contains feature specs, data shapes, flows, permission requirements, enum definitions, and known edge cases. Reading first:

- Prevents re-inventing components, utilities, or flows that already exist
- Catches permission, enum, and schema constraints that are not obvious from code alone
- Keeps terminology consistent with the existing design
- Saves you from misdiagnosing behaviour that is actually documented as intentional

---

## How

1. **List the folder first.** Do not guess filenames. Use your directory-listing tool at the start of every task.
2. **Match by topic, not by exact keyword.** A task about "who changed this record" should read the activity-log / audit doc even if the user never used the word "log".
3. **Read the whole file.** Do not skim. Docs intended for AI consumption are dense — every section matters.
4. **Cross-reference `## Related Docs`.** Feature docs should list sibling docs that share context — follow them.
5. **Fallback locations.** If the project has no dedicated docs folder, check:
   - `README.md` and `README.*.md` at the repository root
   - `CONTRIBUTING.md`, `ARCHITECTURE.md`, `DESIGN.md`
   - `docs/` inside each package of a monorepo
   - Inline JSDoc / TSDoc / docstrings near the feature you're touching

---

## Building the Topic → Doc Index (optional, per-project)

Projects with many docs benefit from a quick lookup table maintained **in the project's own copy of this rule**. Append a table to the bottom of this file once your docs folder stabilises, for example:

```markdown
## Topic → Doc Quick Index

| Topic / keywords in the task | Read |
| --- | --- |
| authentication, login, session | `docs/AUTHENTICATION.md` |
| payments, checkout, refund | `docs/PAYMENTS_FEATURE.md` |
| deployment, hosting, CI/CD | `docs/DEPLOYMENT.md` |
```

Do not invent entries — only add a row when the doc exists and has been verified. Still run a directory listing for each task to catch anything newer than this index.

---

## Self-Check

Before your first edit on a task, verify:

- [ ] I ran a directory listing on the project's documentation folder in this session
- [ ] I identified every doc relevant to this task
- [ ] I read each of those docs in full

If any answer is "no", stop and do it now.
