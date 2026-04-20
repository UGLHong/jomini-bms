---
description: Verify every implementation locally using browser, server, or script output before marking work complete
globs:
alwaysApply: true
---

# Local Verification Rules

## Mandatory Testing

**Every change or implementation MUST be manually tested before the task is considered complete.** No exceptions. Pick the verification method that matches what you changed.

| Change type | Verification method |
| --- | --- |
| Frontend UI (pages, components, styling, layout) | Start dev server → open browser → visually inspect and interact |
| API endpoint (new or modified) | Start dev server → call the endpoint via `curl` / `httpie` / REST client |
| Script / CLI tool | Run the script directly and verify output and exit code |
| Server-side logic (utils, services, jobs) | Trigger via UI, API call, or test harness that exercises the code path |
| Config / build / tooling change | Run the dev server or build and confirm successful startup / completion |
| Pure unit logic with existing tests | Run the project's test suite scoped to the affected file(s) |

Project-specific commands (dev, build, test, typecheck) should be listed in `AGENTS.md` under **Common Commands**. If they aren't, discover them from `package.json` / `Makefile` / `pyproject.toml` / `justfile` / `Cargo.toml` before proceeding.

---

## Verification Process

### 1. Start the Development Server (when applicable)

Check if a dev server is already running on the expected port (commonly `3000`, `5173`, `8000`, `8080`). If not, start it with the project's dev command. Wait for the "ready"/"listening" log line before interacting.

### 2. UI Changes — Open Browser and Verify

Using your browser tool of choice:

1. Navigate to the affected page(s)
2. Take a screenshot to confirm the layout renders
3. Exercise interactive elements related to the change:
   - Click buttons, links, navigation items
   - Fill and submit forms
   - Toggle states (tabs, modals, dropdowns)
4. Verify expected behaviours occur

### 3. API Changes — Call the Endpoint

Use `curl` (or equivalent) to exercise the endpoint directly:

```bash
curl -X POST http://localhost:<port>/api/<path> \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

- Confirm response status and body match expectations
- Test error cases (missing fields, invalid data, unauthorised access) when they are within scope

### 4. Script / CLI Changes — Run and Verify Output

Execute the script directly and check stdout, stderr, and exit code:

```bash
<run-command> <script-path> [args...]
```

### 5. Monitor Logs for Errors

**Browser console:**

- Check for JavaScript errors, framework warnings, and failed network requests
- Pay attention to hydration/mount warnings on SSR frameworks

**Backend / server logs:**

- Watch the dev-server terminal for thrown errors, unhandled rejections, and database errors
- Watch request/response timing if performance is part of the change

**Test output:**

- Every assertion should pass
- Flaky tests are a signal to investigate, not retry blindly

### 6. Test All Affected Routes / Entry Points

If the change touches shared components, utilities, or middleware, exercise every code path that depends on them, not just the one you originally targeted.

---

## Error Handling

When errors surface during verification:

1. **Identify the root cause** from console / server / test output
2. **Fix the issue** in code
3. **Re-verify** the fix
4. **Repeat** until the error is gone

**Give up after 3 failed attempts on the same error.** If verification still fails after 3 tries (dev server won't start, endpoint keeps erroring, browser can't connect), stop retrying, fall back to a code review of the change, and report clearly what you attempted and what failed. Do not silently mark the task complete.

Common issues to watch for:

- Missing imports or export names
- Type mismatches (run the type checker)
- Stale build artifacts (clear cache, restart dev server)
- Port conflicts (something else already listening)
- Auth or CORS errors from missing headers / tokens

---

## User Intervention

Pause and ask the user to step in when:

- **Login required** — the page requires authentication and no session exists
- **Manual data entry** — testing requires data only the user can supply
- **External services** — third-party integrations need manual authorisation (OAuth, payment sandbox, etc.)
- **Destructive actions** — operations that could affect production data
- **Ambiguous behaviour** — unclear whether observed behaviour is correct

When requesting intervention:

1. State the exact action needed
2. Provide the URL or location
3. Wait for confirmation before continuing

Example:

> I need you to log in at `http://localhost:3000/login` before I can verify the profile page. Let me know when you're logged in and I'll continue.

---

## Verification Checklist

Before marking any implementation complete, confirm:

- [ ] Dev server (or test runner / script) executed without build errors
- [ ] The change was exercised end-to-end, not just viewed
- [ ] No new errors in the browser console
- [ ] No new errors in the server / backend logs
- [ ] No new type or lint errors introduced
- [ ] All interactive elements related to the change behave as expected
- [ ] All affected routes, endpoints, or entry points were tested

---

## Notes

- Prefer short incremental waits (2–3s) with snapshots / polling over long blocking waits
- After code edits on a hot-reloading dev server, wait for the "HMR" / "rebuild" log line before re-testing
- After non-hot-reloading changes (config, dependencies), restart the server
- Capture screenshots or terminal excerpts for any regression you report back to the user
