# Frontend plan: CiscoKU Lab

Current state and next steps for the frontend, as of October 30, 2026. The
dated delivery log, the original platform plan and earlier evidence are in
[docs/PLAN_HISTORY.md](docs/PLAN_HISTORY.md). Backend status and the lab VM
work are in the sibling `cyber-lab-backend` repository's `PLAN.md`.

## Where things stand

The frontend runs in two modes, chosen only by server configuration:

| Mode | What it does |
|---|---|
| Preview (default) | Username-only demo with 12 sample labs, simulated sessions and local-only progress. Every backend-facing API route returns 404 before reading cookies, credentials or the network. |
| Live (`FRONTEND_MODE=live`) | Real accounts and sessions through the server-side BFF, the database catalog, instance spawn/poll/extend/stop, flag submission, and persisted Profile, Leaderboard and home progress. |

| Area | State |
|---|---|
| Preview experience | Done. Catalog, briefings, simulated sessions, dashboard, fictional rankings, themes, responsive layouts. |
| BFF security | Done. Encrypted HttpOnly session cookie, same-origin mutation checks, short-lived scoped service tokens, strict validation, no-store responses, no acting-user ids from the browser. |
| Live auth | Done. Login, session restore, logout, email verification and password reset. Signup is closed. |
| Live labs | Done for Welcome. Spawn, pending/running states, target link only while running, refresh-safe expiry, extend and stop. |
| Flag submission | Done. Only for the learner's own running, unexpired instance; input never stored; no automatic retry of an unknown outcome. |
| Live progress | Done. `/api/profile` (session-resolved, `profile:read`) and public `/api/leaderboard`. |
| Learner IP for rate limits | Done. Forwarded only from the header named by `TRUSTED_CLIENT_IP_HEADER`. |
| Hosting | Vercel at https://cyber-lab-frontend.vercel.app, talking to the Render API. Live labs cannot work there yet because the hosted API has no worker or lab host. |

### Welcome test lab

Welcome is a harmless introductory lab used to test the platform end to end;
it shows its flag openly. Phases 1–3 are done and merged to `develop`.
Phase 4 (two-user isolation) has its browser coverage done in
`tests/e2e/welcome-isolation.spec.ts`; the real-container checks run on the
backend's lab VM. Phases 5 and 6 are not started.

## Next steps, in order

1. **Support the Phase 4 VM run** described in the backend's
   `docs/LOCAL_DEVELOPMENT.md`. The frontend needs only `FRONTEND_MODE=live`
   and the shared BFF secrets; use `localhost` for the site and `127.0.0.1`
   for targets so learner cookies never reach a target.
2. **Phase 5 (after approval):** expiry, repeated stop, capacity refusal and
   cleanup-retry states in the session UI, plus inactive-instance submission
   denial.
3. **Phase 6:** full harmless browser journey, preview isolation, and one
   combined responsive/theme/keyboard pass.
4. **Hosted checks once the backend gate allows:** HTTPS cookie and CSRF
   behaviour on the deployed site, email links, and `TRUSTED_CLIENT_IP_HEADER`
   set to a header the host overwrites.
5. **Later:** a real reviewed challenge with per-user flags (Welcome is then
   retired by unpublishing), Learning Paths, and any admin UI.

Public signup stays closed until the backend security gate passes.

## Decisions waiting on the owner

- Approval for Phase 5 after the Phase 4 VM evidence.
- Any hosted configuration change, new dependency or contract change.

## How work is delivered

- Work on a branch, open a PR to `develop`, and merge only when CI is green.
- Frontend and backend stay in their own repositories; the API contract lives
  in the backend's `docs/API.md` and generated OpenAPI (`npm run api:types`).
- Record real evidence here when a step completes; label anything not run.
- Preview data is never presented as live targets, real points or
  authenticated progress.
