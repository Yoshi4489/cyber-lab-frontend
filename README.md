# CiscoKU Lab — frontend

A free university security learning website, designed for curious learners.
The current delivery is a clickable UX mockup with sample data.

## What works

- Guest home and public catalog with 12 sample entries across web security,
  Linux, networking, cryptography, and forensics.
- Search, combined topic/difficulty filters, sorting, grid/list views, bookmarks,
  and public lab briefings.
- Username-only demo onboarding, a personal dashboard, XP, levels, badges,
  streaks, daily goals, and progress by topic.
- Simulated sessions with an absolute expiry timer, stop, finish, and replay.
  Each sample lab awards demo XP once.
- Fictional global leaderboard; clearly marked Learning Paths/Profile previews.
- System, light, and dark themes; desktop and tablet layouts; mobile fallback;
  reduced-motion support and keyboard navigation.

**The visible product remains demo-only.** Demo progress lives in this browser.
The server has same-origin BFF authentication, lifecycle, and submission routes,
but no product page uses them yet. Real content, scoring, capacity, and isolated
targets remain future work in the separate [backend repository](../cyber-range-backend).
No payments are planned. Public account registration remains closed until the
security launch gates are complete.

## Project tracking

Current status: the frontend Phase 1 UX/UI mockup is complete and ready for
review. Server-only backend contract, authentication, sealed-session, lifecycle,
submission, and CSRF groundwork are available, but the live backend and lab
execution system are not connected to the visible product.

### Done

- [x] Established the CiscoKU Lab visual direction and responsive frontend shell.
- [x] Added the public landing page, catalog, search, filters, sorting, bookmarks,
  and lab briefings.
- [x] Added browser-only demo onboarding, learner progress, dashboard, XP, levels,
  badges, streaks, topic progress, and fictional leaderboard data.
- [x] Added the simulated lab lifecycle: start, timer, stop, finish, expiry, and
  replay without creating a real target.
- [x] Added preview pages for future Learning Paths and Profile areas.
- [x] Split the frontend into feature folders with thin App Router entry points.
- [x] Updated the canonical project documentation and frontend security boundary.
- [x] Added CI and verified lint, typecheck, 56 unit tests, a production build,
  the protected BFF smoke flow, and 54 Playwright scenarios across desktop,
  tablet, and mobile layouts.
- [x] Pushed the work to the `develop` branch of the frontend repository in
  small logical commits.

### Currently working

- [ ] Review the Phase 1 mockup and record any UX changes before backend
  integration begins.
- [ ] Verify a released backend contract and deployed BFF configuration without
  exposing a live product in the demo.
- [ ] Keep the frontend demo stable while the separate backend and launch
  controls are completed.

### Planned next

- [ ] Release the backend contract and run the HTTPS-only contract-freshness
  check against `GET /v1/openapi.json`.
- [ ] Configure the BFF's server-only deployment secrets and verify its
  authenticated session path with a non-public test account.
- [ ] Decide and build a real authentication and live-product UI that is
  distinct from browser-local demo onboarding and simulation.
- [ ] Replace browser-only catalog, learner progress, and leaderboard views
  only after the relevant backend data and security controls are ready.

### Still left for the full platform

- [ ] Challenge authoring, runtime flag injection, submissions, scoring, and
  production leaderboard data.
- [ ] Database persistence, capacity limits, rate limits, cleanup workers, and
  monitoring.
- [ ] Target isolation: separate control plane, default-deny egress, private
  network protection, resource caps, short TTLs, and disposable hosts.
- [ ] Complete Learning Paths, Profile, community, teams, and certificates.
- [ ] Production deployment, domains, environment configuration, accessibility
  review, security review, and launch approval.

The browser demo remains usable while this work is pending. Do not describe its
sample XP, progress, leaderboard, or lab sessions as real platform data.

## Run locally

Use Node.js 22 or newer; CI uses Node 24.

```powershell
npm ci
npm run dev
```

Open **http://127.0.0.1:3000**. Fonts and artwork are local. No backend or
database is required. Choose **Join the demo**, enter a fictional username,
then view a sample lab and select **Start Lab** and **Finish Lab**.

A production preview can run with `npm run build` followed by `npm start`.
Vercel is the chosen preview hosting target. This change does not provision or
publish a Vercel project.

### Backend contract types

The frontend consumes the backend through a server-only adapter; it never
imports sibling repository source. When the backend is running, refresh the
committed generated types from its public contract:

```powershell
$env:BACKEND_URL = "http://127.0.0.1:4000"
npm run api:types
npm run api:types -- --check
```

The generator fetches `GET /v1/openapi.json`, validates the configured API
origin, and writes `src/features/backend/generated/openapi.ts`. It does not
write or maintain a copied OpenAPI document. Generated types and the adapter
are Phase 1 groundwork only; the browser-local demo remains the active UI
until later frontend phases connect catalog, authentication, and lifecycle
flows.

The **Backend contract freshness** GitHub Actions workflow provides the
equivalent read-only check from CI. Run it with a routable HTTPS backend API
origin after a backend contract release; it fails if the committed types do
not match `GET /v1/openapi.json` and never rewrites files. Full automatic
cross-repository enforcement requires the backend release workflow to dispatch
this check (or publish a contract endpoint/artifact); this frontend repository
does not assume a deployment URL or import backend source.

### BFF authentication

The browser must use the same-origin frontend BFF; it must never call the backend
directly or send an acting user ID. The server-only BFF exposes:

| Endpoint | Behavior |
|---|---|
| `POST /api/auth/login` | Accepts only email and password, performs a BFF-authenticated backend login, and stores an encrypted HttpOnly cookie. |
| `GET /api/auth/session` | Resolves the sealed cookie server-side and returns only `authenticated`, display name, and verification state. |
| `POST /api/auth/logout` | Revokes the backend session and clears the cookie. Repeated or expired logout is safe. |
| `POST /api/instances` | Accepts only `challengeId` plus `Idempotency-Key`; returns `202` with pending lifecycle intent. |
| `GET /api/instances/:id` | Polls an owned instance with `instances:read`. The target URL is absent until the backend reports `running`. |
| `POST /api/instances/:id/extend` | Requires an empty body, `instances:write`, and `Idempotency-Key`; returns `202`. |
| `DELETE /api/instances/:id` | Requires an empty body, `instances:write`, and `Idempotency-Key`; returns `202`. |
| `POST /api/submissions` | Accepts only `challengeId`, `instanceId`, and `flag`; uses `submissions:write` and returns scoring metadata without echoing the flag. |

All state-changing BFF routes require an explicit same-origin `Origin` header
and reject cross-origin browser requests. All BFF responses use
`Cache-Control: no-store`. Frontend code must create one idempotency key per
logical instance mutation and reuse it for retries. The opaque backend session
token, backend user ID, role, and scopes never reach browser JavaScript through
these routes. Public signup is still disabled.

To enable the BFF routes in a deployed frontend, set these server-only values
in the host's secret manager (never in `NEXT_PUBLIC_*` variables):

| Variable | Purpose |
|---|---|
| `BACKEND_URL` | Credential-free backend API origin; production requires HTTPS outside loopback. |
| `BFF_PUBLIC_ORIGIN` | Exact browser-facing frontend origin used for mutation-origin validation; production requires HTTPS outside loopback. |
| `BFF_AUTH_SECRET` | Shared backend bootstrap credential for login, session resolution, and logout. |
| `BFF_SESSION_SECRET` | Independent frontend-only secret, at least 32 characters, used to encrypt the HttpOnly cookie value. Rotating it invalidates browser sessions. |
| `BACKEND_SERVICE_TOKEN_SECRET`, `SERVICE_TOKEN_ISSUER`, `SERVICE_TOKEN_AUDIENCE` | Separate configuration for short-lived, scoped lifecycle and submission tokens. |

See [`.env.example`](.env.example) for names only. Do not add a real `.env`
file, token, certificate, or flag to Git.

### Demo state

| Storage key | Purpose |
|---|---|
| `ciscoku:learner:v1` | Demo username, sign-in state, unique completions, session timestamps |
| `cyber-range:saved-labs:v1` | Existing browser bookmarks, preserved across the redesign |
| `ciscoku:theme` | System/light/dark preference |

XP and levels are derived from catalog fixtures and unique completions. These
are illustrative reward rules, not production scoring policy. The same username
resumes local progress; entering a different username starts a fresh demo.
Sign out does not clear progress. The **Demo guide** includes an explicit reset.
If storage is blocked, the current tab remains usable with a warning; refreshing
can lose that temporary state. No demo value grants server access.

## Repository map

| Path | Responsibility |
|---|---|
| `src/app/` | Thin App Router entry points, metadata, HTTP status route |
| `src/features/shell/`, `theme/` | Shared navigation, temporary identity, theme controls |
| `src/features/catalog/`, `briefing/`, `bookmarks/` | Sample metadata, discovery, public briefings, saved labs |
| `src/features/learner/` | Validated demo state and onboarding |
| `src/features/dashboard/`, `session/`, `leaderboard/` | Progress, simulated lifecycle, fictional rankings |
| `src/features/landing/`, `preview/`, `guide/` | Guest entry, future-page previews, demo help |
| `src/features/backend/` | Server-only backend adapters, BFF authorization, and maintainer status UI |
| `src/components/ui/`, `src/styles/` | Small shared primitives, theme tokens, loading states |
| `tests/e2e/`, `tests/fixtures/` | Browser flows and loopback-only backend fixture |
| `.github/workflows/frontend.yml` | Lint, types, build, and browser checks on main/develop pushes |

Keep components and styles beside their feature. Reusable UI belongs in
`components/ui`; global CSS is limited to shared tokens and primitives.
The empty legacy monorepo directories are not application roots.
`challenges/` contains earlier authoring examples; this UX phase adds no
challenge internals.

## Checks and delivery

```powershell
npm run lint
npm run typecheck
npm run test:unit
npm run build
npm run test:bff
npx playwright install chromium
npm run test:e2e
```

Run `test:bff` after `build`. It starts the built frontend and a loopback backend
on temporary ports, exercises the sealed-session lifecycle and submission path,
then terminates both. Playwright runs Chrome desktop, tablet, and mobile scenarios
using ports 3100 and 4101. Neither check starts real targets or contacts your
configured backend. CI runs the same gates and uploads browser failure reports.

Push one logical group, wait for its CI result, then continue. Keep refactors,
formatting, dependency changes, and features in separate commits.
See `AGENTS.md` for commit conventions.

The optional maintainer check is under **Demo guide → Maintainer tools**.
Set `BACKEND_URL` using the existing environment example if needed. The
server checks only `/healthz`; API availability does not enable lab execution.

### Deployed BFF preflight

Before enabling a deployed BFF, set the documented server-only values in the
host secret manager, confirm that its bootstrap credential and service-token
configuration match the backend, and use a non-public test account to verify
login, session resolution, and logout. Then run the **Backend contract
freshness** workflow with the released HTTPS backend origin. It compares the
committed generated types with `GET /v1/openapi.json` without rewriting files.

Do not use this preflight to create a live target until the backend's Phase 3
launch controls are complete. The frontend repository has no deployment secret,
backend URL, or authority to run that environment-specific check.

## Canonical documentation

| Document | Purpose |
|---|---|
| [AGENTS.md](AGENTS.md) | Repository context, security boundaries, working rules |
| [PLAN.md](PLAN.md) | Confirmed UX decisions, UI roadmap, future platform phases |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Trust boundaries, demo state, future lifecycle and API |
| [SECURITY.md](SECURITY.md) | Threat model and required launch gates |
| [Challenge authoring](docs/challenge-authoring.md) | Future challenge manifests and author workflow |
| [Decision records](docs/adr/) | Long-lived architecture choices |

The control plane must never share a host with vulnerable targets. Future
targets require default-deny egress, private-network isolation, resource caps,
short lifetimes, and disposable hosts. Those controls belong to the backend
and lab infrastructure.
