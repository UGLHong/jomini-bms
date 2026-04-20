---
description: General coding conventions that apply to every task in this repository
globs:
alwaysApply: true
---

# General Coding Rules

These rules are stack-agnostic. Project-specific conventions (framework APIs, auto-imports, preferred UI libraries, build commands) should be recorded in `AGENTS.md` under **Project-Specific Configuration** or in dedicated rule files alongside this one.

---

## Rule Maintenance

When the user says "remember this rule", "add a rule", or equivalent, create or update a markdown file in `.agent/rules/`. `.agent/rules/` is the single source of truth for agent rules — other editor-specific rule folders (e.g. `.cursor/rules/`, `.github/copilot-instructions.md`) should be symlinks or generated mirrors of it.

Each rule file starts with this front-matter:

```yaml
---
description: One-line summary of what the rule enforces
globs:            # optional glob(s) to scope the rule
alwaysApply: true # set to true for rules that must always be in context
---
```

---

## Code Style & Naming

- Write clean, self-documenting code. Avoid comments that restate what the code obviously does (e.g. "increment counter").
- When a comment is needed, keep it **short, concise, on top of the code**, and focused on intent — not a verbose explanation.
- Do not capitalize comments; they are not sentences in prose.
- Use the casing convention the rest of the codebase uses for file and folder names (commonly `kebab-case` for JS/TS UI files, `snake_case` for Python, `PascalCase` for some framework components). Match, don't invent.
- Do not prefix TypeScript interfaces/types with `I` (use `User`, not `IUser`).
- Do not export TypeScript types/interfaces that are only consumed within a single file — keep them local.
- Remove all unused imports, variables, and dead code as part of the same change that orphaned them.
- Do not use single or two-letter identifiers for variables, parameters, or props (no `const n`, `const x`). Names should be descriptive.
- Prefer `dropdownItems` over `itemsForDropdown` — put the noun before the qualifier.
- Do not reassign a variable to a new variable without a solid reason (e.g. original is ambiguous or very long).
- Do not use negated conditions when the inverse is clearer — prefer `a === 1 ? 'c' : 'b'` over `a !== 1 ? 'b' : 'c'`.

---

## Imports

- Prefer named imports (`import { useState } from 'react'`).
- Use path aliases defined in `tsconfig.json` / `jsconfig.json` / equivalent, instead of long relative paths.
  - Example: `import { Modal } from '@/ui/base/modal'`, not `import { Modal } from '../../ui/base/modal'`.
- Always inspect the project's TS/JS config before generating import paths.

---

## Reuse Before You Create

Before creating anything new, **search the codebase for an existing equivalent**:

| Looking for | Typical locations to check |
| --- | --- |
| Components | `components/`, `ui/`, `shared/`, framework-specific folders |
| Utilities (pure, npm-only) | `utils/`, `utility/`, `lib/` |
| Helpers (domain-aware) | `helpers/`, `helper/`, `services/` |
| Constants | `const/`, `constants/`, `config/` |
| Types | `types/`, `@types/`, `schemas/`, colocated `*.types.ts` |
| Network / API clients | Central store or client module (search for `fetch`, `axios`, `$fetch`, `apiClient`) |
| Icons | Check installed icon libraries first (`lucide-*`, `@heroicons`, `react-icons`, etc.) before adding SVGs |

If a reusable thing is genuinely missing:

- New constant → add to the existing `const/` or `constants/` folder
- New utility (pure, npm-only) → new file under the existing `utils/` folder
- New helper (domain-aware) → new file under the existing `helpers/` folder
- New icon → use an existing icon library if available; otherwise fall back to an inline SVG or placeholder `<div>`

---

## Styling (when applicable)

- If the project uses Tailwind CSS, prefer Tailwind utility classes on `className` over inline styles or CSS modules.
- Use the project's preferred class-merging utility (commonly `twMerge` from `tailwind-merge`, or a wrapper like `classNames()` / `cn()`). Check the codebase — do not introduce a competing one.
- When refactoring an element that already merges classes, keep using the same utility the rest of the file uses.

---

## React / Component Rules (when applicable)

- Do not create inline component/render functions inside JSX that are immediately executed — extract them into a named component in the same file and use it.
- JSX attribute values should not contain functions created in the same scope unless the function is a single short line. Extract handlers with `useCallback` (or a hoisted function) and pass the reference.
- Use `useCallback`, `useMemo`, and `useState` appropriately — memoize when identity stability or recomputation cost matters, not reflexively.
- Follow standard HTML event naming (kebab-cased DOM events, camelCased React props): `onChange`, `onClick`, `onSubmit`. For custom component events, mirror the closest HTML equivalent (`onChange`, not `onValueChange`) when semantics match.
- Name props/attributes for what they are (`isLoading`, `dropdownItems`), not how they're used.
- When a component would need `undefined` literally, add `// eslint-disable-next-line no-undefined` above that line so the linter does not complain.

---

## i18n & Copy

- If the project has an i18n system, put user-facing strings through it. Do not hardcode strings in components when a translation layer exists.
- When adding new copy, update the base/English translation file at minimum.

---

## Internal / Environment

- Do not commit secrets. When testing, check for existing environment variables or tokens in memory tools / `.env*` files rather than inventing new ones.
- When storing anything to long-term memory tools (MCP memory, etc.), include workspace context (repo name or path) to avoid cross-project contamination.

---

## Development Workflow

- Follow the verification process in `local-verification.md` after every UI, API, or behavioural change.
- Do not automatically stage or commit changes unless asked.
- Do not change code that is unrelated to the request.
- Understand the user's goal before editing — irrelevant changes outside the scope of the request are not welcome.

---

## Linting

- Always check TypeScript/language typings before generating code when types are involved.
- After substantive edits, run the project's linter / type checker and fix any warning you introduced if the fix takes fewer than 3 attempts.
- Do not suppress warnings to silence them; fix the underlying issue where reasonable.
