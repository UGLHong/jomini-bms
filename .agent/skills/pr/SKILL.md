---
name: pr
description: Create high-quality pull requests with intelligent change analysis, title generation, and structured descriptions
allowed-tools: Bash(gh:*), Bash(git:*)
compatibility: Requires git and the GitHub CLI (gh). Works with any repository that uses pull requests.
---

# /pr

Automate creation of high-quality, descriptive pull requests. Stack-agnostic — infers base branch, title scope, and reviewers from the repository itself.

## Usage

```
/pr
/pr --draft
/pr --base <branch>
/pr --reviewers @user1,@user2
/pr --template <template-name>
```

Arguments: `$ARGUMENTS`

---

## What This Skill Does

1. **Detect the base branch.** Check `gh repo view --json defaultBranchRef` and any convention in the repo (e.g. `develop`, `main`, `trunk`). Default to the repository's default branch unless `--base` is given.
2. **Change analysis.** Run `git status`, `git diff <base>...HEAD`, and `git log <base>..HEAD` to identify modified files, commits since divergence, breaking changes, new dependencies, and schema changes.
3. **Title generation.** Produce a conventional-commit-style title (see format below).
4. **Description generation.** Render the description from the template below, filling every section that applies.
5. **Issue linking.** Parse the branch name (e.g. `feat/ABC-123-thing`) for ticket IDs and insert `Closes #<id>` / `Resolves <url>` where appropriate.
6. **Reviewer suggestions.** Optionally use `git blame` on changed files to surface recent contributors.
7. **Create the PR.** Push the branch (`git push -u origin HEAD`) then `gh pr create` with the generated title, body, and flags.

---

## Title Format

```
<type>(<scope>): <short imperative description>
```

Examples:

```
feat(api): add user profile endpoints
fix(auth): handle expired JWT refresh path
refactor(db): extract query builder into shared util
docs(readme): update installation steps
chore(deps): upgrade axios to 1.6.0
```

Scope is optional but encouraged. Infer it from the dominant touched directory (`api`, `web`, `mobile`, `infra`, `docs`, etc.).

---

## Description Template

Use this structure unless the repo has its own `.github/pull_request_template.md` — in which case follow that template and fill placeholders.

```markdown
# Description

Short summary of this PR.

**What**
- <bullet — what changed, 1–2 lines>

**Why**
- <bullet — user / business / technical reason, 1–2 lines>

**How**
- <bullet — high-level approach, 1–2 lines>

# Changes

**Added**
- `path/to/new/file.ext` — short description

**Modified**
- `path/to/existing/file.ext` — short description

<!-- omit unused subsections; exclude changeset / auto-generated metadata files -->

## Testing

<!-- include when reviewers need to reproduce -->
- Page / route to exercise: `/path`
- Steps:
  1. ...
  2. ...

## Breaking Changes

<!-- include only when applicable -->
- <describe the break and the migration path>

## Dependencies

<!-- include only when new dependencies were added -->
- `package-name@version` — reason
```

**Keep the description short and concise, focused on what actually changed.** Use checkmarks for completed items where appropriate.

---

## Issue Linking

Detect IDs from the branch name and insert the appropriate closing keyword near the top of the description:

| Branch pattern | Inserted line |
| --- | --- |
| `feat/ABC-123-…` | `Closes ABC-123` |
| `fix/#456-…` | `Fixes #456` |
| `hotfix/…` | *(none unless an ID is present)* |

If the project uses Linear / Jira / Shortcut with a URL convention, prefer the full URL so the tracker auto-links back.

---

## Reviewer Suggestions

When `--reviewers` is not supplied:

- Skip auto-assignment unless the repo has a `.github/CODEOWNERS` file or a `.github/pr-config.yml` declaring reviewer logic
- If CODEOWNERS exists, GitHub will handle assignment automatically — do not override it
- If the user provides reviewers, pass them via `--reviewer`

---

## Draft vs Ready

- Use `--draft` for early feedback or when CI is expected to fail
- Use a ready PR when:
  - Local verification passed (`local-verification.md`)
  - Tests/lint/build commands succeed locally
  - Documentation updates are included in the same PR

---

## Command Flags

| Flag | Effect |
| --- | --- |
| `--draft` | Create the PR as a draft |
| `--base <branch>` | Override the detected base branch |
| `--reviewers <list>` | Comma-separated GitHub usernames / teams |
| `--template <name>` | Use a specific `.github/pull_request_template/<name>.md` |

---

## Quality Checks Before Creating

Before calling `gh pr create`, verify:

- [ ] The branch is pushed and tracking `origin/<branch>`
- [ ] Base branch is correct for this change
- [ ] Title matches conventional-commit format
- [ ] Description includes **What / Why / How**
- [ ] Breaking changes (if any) are documented
- [ ] New dependencies (if any) are listed
- [ ] Documentation updates are either in this PR or not applicable (per `documentation.md`)
- [ ] No secrets or `.env` files are staged

---

## Post-Create

After the PR is created, the skill should:

1. Print the PR URL so the user can open it
2. Optionally run `gh pr checks` once to confirm CI has started
3. Surface any immediate failure (failed lint, failed build) so the user can react quickly

---

## Notes

- Never `git push --force` to `main` / `master` / `develop`; warn the user if they request it
- Never update `git config` as part of this flow
- If the PR title / description needs manual tweaking, prefer `gh pr edit` over creating a new PR
