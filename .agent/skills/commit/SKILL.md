---
name: commit
description: Create well-formatted commits using emoji conventional-commit messages, with change analysis and atomic-commit splitting
allowed-tools: Bash(git:*), Bash(*)
compatibility: Requires git. Package manager / hook setup is detected from the project.
---

# /commit

Create well-formatted commits with conventional-commit messages and emoji. Stack-agnostic — works in any git repository.

## Usage

```
/commit
```

With options:

```
/commit --no-verify                # skip pre-commit checks
/commit --message "<preset text>"  # use caller-supplied message verbatim
```

Arguments: `$ARGUMENTS`

---

## What This Skill Does

1. **Pre-commit checks** (unless `--no-verify`): detect and run the project's lint, build, and doc-generation commands.
   - Look at `package.json` scripts, `Makefile` targets, `pyproject.toml` tool sections, `justfile`, `Cargo.toml`, or CI config to discover them.
   - Typical commands: `<pm> lint`, `<pm> typecheck`, `<pm> build`, `<pm> test` — where `<pm>` is the project's package manager.
2. **Stage analysis**: run `git status` and `git diff --staged`. If nothing is staged, stage all modified and new files with `git add -A`.
3. **Scope analysis**: review the diff to decide whether the changes form one atomic commit or several.
4. **Atomic splitting**: if multiple distinct concerns are present, propose a split and commit each group separately.
5. **Message generation**: for each commit, produce a message in emoji conventional-commit format (see below).

---

## Commit Message Format

```
<type>: <emoji> <short imperative description>
```

- **Present tense, imperative mood** — "add feature", not "added feature"
- **Concise first line** — under 72 characters
- **Scope is optional** but useful: `feat(auth): ✨ add TOTP enrollment flow`
- Optional body after a blank line for context

### Types

- `feat` — new feature
- `fix` — bug fix
- `docs` — documentation only
- `style` — formatting, whitespace, missing semicolons (no logic change)
- `refactor` — code change that neither fixes a bug nor adds a feature
- `perf` — performance improvement
- `test` — add / fix tests
- `chore` — tooling, build, config, dependencies
- `ci` — CI/CD configuration
- `revert` — revert a previous commit
- `wip` — work in progress (avoid on main branches)
- `experiment` — throw-away experiment

### Type → Emoji Cheat Sheet

| Type | Emoji | Notes |
| --- | --- | --- |
| `feat` | ✨ | new feature |
| `feat` | 🏷️ | add/update types |
| `feat` | 👔 | business logic |
| `feat` | 🦺 | input validation |
| `feat` | 🔊 | add logs |
| `feat` | 📈 | analytics / tracking |
| `feat` | 🌐 | i18n / localisation |
| `feat` | 📱 | responsive work |
| `feat` | 🚸 | UX / usability |
| `feat` | ♿️ | accessibility |
| `feat` | 🔍 | SEO |
| `feat` | 💬 | user-facing copy |
| `feat` | 🚩 | feature flags |
| `feat` | 💥 | breaking change |
| `fix` | 🐛 | bug fix |
| `fix` | 🚑️ | critical hotfix |
| `fix` | 🩹 | minor non-critical fix |
| `fix` | 🚨 | fix lint/compiler warnings |
| `fix` | 💚 | fix CI build |
| `fix` | 🔒️ | security |
| `fix` | 🥅 | error handling |
| `fix` | 🔥 | remove code/files |
| `fix` | 🔇 | remove logs |
| `fix` | 👽️ | update after external API change |
| `fix` | ✏️ | typo |
| `refactor` | ♻️ | general refactor |
| `refactor` | 🚚 | move / rename |
| `refactor` | 🏗️ | architectural change |
| `refactor` | ⚰️ | remove dead code |
| `perf` | ⚡️ | performance |
| `style` | 💄 | UI formatting |
| `style` | 🎨 | code structure / format |
| `test` | ✅ | add/fix tests |
| `test` | 🧪 | add a failing test |
| `test` | 📸 | snapshots |
| `test` | 🤡 | mocks |
| `docs` | 📝 | documentation |
| `docs` | 💡 | source comments |
| `chore` | 🔧 | tooling / config |
| `chore` | 📦 | packages / compiled files |
| `chore` | ➕ / ➖ | add / remove dependency |
| `chore` | 📌 | pin dependency |
| `chore` | 🌱 | seed data |
| `chore` | 🔀 | merge branches |
| `chore` | 🎉 | initial commit |
| `chore` | 🔖 | release / version tag |
| `chore` | 🙈 | `.gitignore` changes |
| `chore` | 🧑‍💻 | developer experience |
| `ci` | 🚀 | CI/CD improvement |
| `ci` | 👷 | CI build system |
| `db` | 🗃️ | database / schema |
| `assets` | 🍱 | assets |
| `ui` | 💫 | animations / transitions |
| `revert` | ⏪️ | revert |

---

## Splitting Commits

When analysing the diff, split into multiple commits when any of these apply:

1. **Different concerns** — unrelated parts of the codebase
2. **Different types** — mixing feat / fix / refactor
3. **File-pattern mismatch** — source vs docs vs config in one commit
4. **Logical grouping** — easier to review as separate commits
5. **Size** — very large diffs benefit from segmentation

Each resulting commit should be **atomic**: self-contained, buildable, and describable in one sentence.

---

## Examples

Single commit:

```
feat(auth): ✨ add TOTP enrolment modal
fix(orders): 🐛 handle undefined shipping address in checkout
refactor(db): ♻️ extract query builder into shared util
docs: 📝 document new notification pipeline
chore(deps): ➕ add zod for runtime validation
```

Split into atomic commits:

```
1) feat: ✨ add solc version type definitions
2) docs: 📝 document new solc version support
3) chore: 🔧 bump package.json tooling
4) test: ✅ add unit tests for solc version resolver
```

---

## Pre-Commit Hook Awareness

If the repository uses pre-commit hooks (Husky + `lint-staged`, `pre-commit` Python framework, `lefthook`, etc.), they will run on `git commit` and **cannot be bypassed** without `--no-verify`.

- Detect hooks by inspecting `.husky/`, `.pre-commit-config.yaml`, `lefthook.yml`, or `package.json` → `lint-staged`
- Common enforcement: formatters (Prettier, Black, gofmt), linters (ESLint, Ruff), trailing newline checks
- **All files must end with a trailing newline** under most formatters — this is the most common hook failure
- If a hook fails:
  1. Read the error to identify the failing file(s)
  2. Fix the formatting issue (often a missing trailing newline)
  3. Re-stage with `git add`
  4. Re-run the commit

---

## Important Notes

- Pre-commit checks run by default unless `--no-verify` is passed
- If specific files are already staged, only those files are committed
- The message is always constructed from the **actual diff**, not assumptions
- Always review the diff before finalising the message
- Never use `git commit --amend` on a commit you didn't create in this session, or on a commit that has been pushed, unless the user explicitly asks
