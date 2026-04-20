---
description: Mandatory documentation file for every qualifying feature change
globs:
alwaysApply: true
---

# Feature Documentation Rule

## Documentation is Mandatory

Writing or updating documentation is **not optional**. It is a required deliverable for every qualifying change. A task is not complete until the relevant documentation file exists or has been updated.

The documentation folder is commonly `/docs`, but use whatever folder this project has adopted (recorded in `AGENTS.md` under Project Layout Reference). Throughout this rule, `/docs` is used as a placeholder — substitute your project's actual folder.

---

## What Requires a Doc

### Always requires a new or updated doc

| Change type | Action |
| --- | --- |
| New feature or user-facing capability | Create a new doc file |
| New API endpoint(s) | Create or update the feature's doc |
| New database entity or schema change | Create or update the feature's doc |
| New authentication / authorization mechanism | Create or update the feature's doc |
| New page, modal, or significant UI flow | Create or update the feature's doc |
| New shared utility, helper, hook, composable, or store with cross-cutting impact | Create or update the feature's doc |
| Modification to an existing flow's behaviour | Update the existing doc for that feature |

### Does not require a doc

- Bug fixes that don't change behaviour (typos, crash fixes, off-by-one errors)
- Style-only changes (CSS, spacing, colours)
- Refactoring with no behavioural change
- Config or tooling changes with no user-visible effect

---

## When to Write the Doc

Write or update the doc **as part of the same task**, before marking it complete. Do not defer documentation to a follow-up task.

Correct order:

1. Implement the feature
2. Verify it locally (see `local-verification.md`)
3. Write or update the doc — **this is part of step 1, not a separate step**
4. Mark the task done

---

## Updating vs Creating

**Creating:** When implementing something entirely new, create a new file.

**Updating:** When extending or modifying an existing feature, find its existing doc and update it. Do not create a duplicate. Always list the docs folder first to check.

When updating, add a `## Changelog` section at the bottom if one doesn't exist, and append an entry with today's date:

```markdown
## Changelog

- **YYYY-MM-DD** — short summary of the change (new file/component/endpoint added, behaviour changed, constraint added)
```

---

## File Naming

Use `SCREAMING_SNAKE_CASE` matching the feature domain:

```
/docs/AUTHENTICATION.md
/docs/BILLING_WORKFLOW.md
/docs/NOTIFICATION_PIPELINE.md
/docs/SEARCH_INDEXING.md
```

Keep names broad enough to encompass future related additions. Do not create narrow per-change files like `LOGIN_BUTTON_FIX.md`.

---

## Write for AI Agent Consumption

Documentation in this project is primarily read by AI agents, not humans. Write accordingly:

- **Be explicit over implicit** — never assume context. State the obvious if it prevents ambiguity.
- **Prefer structured data over prose** — use tables, bullet lists, and code blocks instead of paragraphs.
- **Use exact file paths** — always use full paths from project root (e.g. `src/server/api/auth/login.ts`), not vague descriptions.
- **State the "why" alongside the "what"** — agents need intent to make correct decisions.
- **Define every status code, enum, or magic value** — do not leave constants unexplained.
- **Make flows machine-readable** — use numbered step lists for sequences, not narrative prose.
- **Be consistent with terminology** — pick one word for each concept and use it throughout.
- **Flag constraints and non-obvious behaviour explicitly** — use a dedicated `## Constraints & Edge Cases` section.
- **Cross-reference related docs** — link to sibling doc files when features are connected.

---

## Required Sections

Every feature doc must contain these sections (omit only if genuinely not applicable):

```markdown
## Overview
One or two sentences: what this feature does and why it exists.

## Flow
Step-by-step numbered list of the full execution path, from trigger to result.
Include both happy path and key failure paths.

## Key Files
Table of exact file paths and their role in this feature.

## Data Shape
TypeScript types / JSON examples / schema definitions of the key inputs, outputs, and entities.

## Status Codes / Enums
Table or list of every status value, enum member, or magic string with its meaning.
(Omit if the feature has none.)

## Constraints & Edge Cases
Bullet list of non-obvious rules, guards, and failure modes.

## Related Docs
Links to other doc files that are relevant.

## Changelog
Running list of significant changes, newest first.
(Omit on first creation; add on first update.)
```

---

## Section Templates

### Flow example

```markdown
## Flow

1. User clicks "Submit" on `/checkout` page
2. Client calls `POST /api/orders` with cart payload
3. Server validates payload against `OrderSchema`; rejects with `400` on failure
4. Server creates `Order` entity with status `PENDING`
5. Server enqueues `process-payment` job on the payments queue
6. Worker charges the payment provider; on success sets status `PAID`, on failure sets `FAILED` and schedules retry
7. Client polls `GET /api/orders/:id` until status leaves `PENDING`
```

### Key Files example

```markdown
## Key Files

| File | Role |
| --- | --- |
| `src/server/api/orders/create.ts` | POST handler that creates the order and enqueues the payment job |
| `src/server/workers/process-payment.ts` | Queue worker that charges the payment provider |
| `src/server/db/entities/order.ts` | ORM entity for `orders` table |
| `src/client/pages/checkout.tsx` | Checkout page that submits the order |
| `src/shared/schemas/order.ts` | Shared validation schema used on both client and server |
```

### Data Shape example

```markdown
## Data Shape

**`POST /api/orders` request:**

```typescript
{
  items: Array<{ productId: string; quantity: number }>;
  shippingAddressId: string;
  couponCode?: string;
}
```

**`Order` entity columns:**

```typescript
{
  id: string;
  userId: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  totalCents: number;
  createdAt: Date;
  paidAt: Date | null;
}
```
```

---

## Self-Check Before Finishing

Before marking any task complete, verify:

- [ ] The docs folder shows a file for this feature
- [ ] All required sections are present
- [ ] Every file path mentioned in the doc is accurate
- [ ] Enums and status values are defined
- [ ] `## Changelog` is updated if this is a modification
