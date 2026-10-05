# CiscoKU Lab — frontend

A free university security learning website, designed for curious learners.
The frontend is being integrated with the independent backend in verified,
separate pushes.

## Current delivery

- Real account login, encrypted HttpOnly BFF sessions, logout, email verification,
  and password recovery. Public account registration remains closed.
- Published database catalog, search/filter/sort, bookmarks, backend briefings,
  and published recommendations on the home and demo dashboard.
- Learner HTTP instance controls at `/labs/[slug]/session`: start, poll, resume
  by a revalidated ID, extend, and stop. Target links appear only while running.
- Shared typed browser/server HTTP layers, stable error handling, and loading,
  empty, retry, and storage-failure states.
- Existing visual design, local artwork/fonts, themes, and responsive navigation.

Integration is not complete. Dashboard identity/progress, the sidebar account,
and the leaderboard are still clearly labeled browser-local demos. Learning
Paths and Profile remain previews. Demo identity never authorizes a backend
operation or records a real solve. `/signup` is demo-only username onboarding,
not public account registration. Real accounts sign in at `/login`.

Remaining groups: backend account navigation, submissions and progress/profile,
the database leaderboard, and real isolated-worker/ingress acceptance. The
loopback fixture verifies frontend behavior; it does not establish runtime
isolation, worker availability, or production launch readiness.

See [PLAN.md](PLAN.md) for the current checkpoint and categorized push history.

## Run locally

Use Node.js 22 or newer; CI uses Node 24.

```powershell
npm ci
npm run dev
```

Open **http://127.0.0.1:3000**. Fonts and artwork are local. Configure the
server-only variables listed below in an ignored `.env.local` and start the
backend separately using its README. The default API origin is
`http://127.0.0.1:4000`; this repository does not start or modify backend services.
Set `BFF_PUBLIC_ORIGIN=http://127.0.0.1:3000` for the default frontend command.
Use a provisioned test account at `/login`, then browse the published catalog.
Only start a real lab on a prepared isolated worker with its security gates met.

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
write or maintain a copied OpenAPI document. Generated types and shared
runtime validators support the integrated catalog, authentication, and lifecycle
flows; progress and leaderboard UI conversion remains pending.

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
| `GET /api/catalog` | Combines validated categories and challenges from the public database API without a mock fallback. |
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
| `LIVE_INSTANCE_UI` | Optional. `true` exposes the operator instance-control surface at `/instances`. Server-only, so the browser cannot reveal it; unset returns `404`. |

See [`.env.example`](.env.example) for names only. Do not add a real `.env`
file, token, certificate, or flag to Git.

### Instance control surface

`/instances` is an operator surface for the instance lifecycle: spawn, poll,
extend, and destroy one target through the BFF. It exists only when
`LIVE_INSTANCE_UI=true`, is never linked from the demo navigation, and carries a
banner stating that the header's demo label does not apply to it. It requires a
backend session established through `/login`. The browser generates and retains
one idempotency key per logical
mutation, sends only `challengeId`, and receives a target URL only once the
backend reports `running`. Enable it only on a deployment whose backend security
gates in [`SECURITY.md`](SECURITY.md) are complete.

### Remaining demo state (not backend identity or progress)

| Storage key | Purpose |
|---|---|
| `ciscoku:learner:v1` | Demo username, sign-in state, unique completions, session timestamps |
| `cyber-range:saved-labs:v1` | Existing browser bookmarks, preserved across the redesign |
| `ciscoku:theme` | System/light/dark preference |
| `ciscoku:active-instance:v1` | Only instance/challenge IDs; ownership and current state are revalidated by the BFF |

Instance mutation retry keys are stored separately in session storage under
`ciscoku:mutation:*` and removed after a confirmed response. They are not
authentication credentials. Logout clears the remembered instance; terminal
statuses stop polling and clear it too.

The historical simulated completion controls are no longer on lab pages.
XP and levels still displayed in the demo dashboard are derived from old catalog
fixtures and unique local completions, not from backend solves. These
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
| `src/features/catalog/`, `briefing/`, `bookmarks/` | Published catalog, preview metadata, backend briefings, saved labs |
| `src/features/learner/` | Validated demo state and onboarding |
| `src/features/dashboard/`, `session/`, `leaderboard/` | Demo progress, backend lifecycle, fictional rankings |
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

## Live API integration

The real authentication surfaces are `/login`, `/verify-email`,
`/forgot-password`, and `/reset-password`. Public signup remains closed.
The catalog and learner session panel now use the real API. Navigation identity,
dashboard progress, and leaderboard screens are being converted in later groups.
The live session panel explicitly distinguishes itself from the demo shell.

Configure frontend-only `BFF_SESSION_SECRET` independently of all backend
secrets. `BFF_AUTH_SECRET`, `BACKEND_SERVICE_TOKEN_SECRET`,
`SERVICE_TOKEN_ISSUER`, and `SERVICE_TOKEN_AUDIENCE` must match the backend.
Set `BACKEND_URL=http://127.0.0.1:4000` and `BFF_PUBLIC_ORIGIN` to the exact
frontend browser origin. No credential uses a `NEXT_PUBLIC_` variable.

To check login, refresh, the HttpOnly cookie, and logout against a prepared
local backend, build the frontend and run the verifier with ignored environment
files. Use a disposable account; the verifier never prints its credentials.

```powershell
npm run build
node --env-file=../cyber-range-backend/.env --env-file=.env.local scripts/verify-live.mjs
```

Set `LIVE_PLAYER_EMAIL` and `LIVE_PLAYER_PASSWORD` in the ignored frontend
`.env.local` for that verifier. It temporarily starts the built frontend at
`http://127.0.0.1:3200`, uses the running API, and stops its own frontend
afterward. `LIVE_FRONTEND_ORIGIN` overrides this test origin. These variables
are used only by the verification script, not by client components.
