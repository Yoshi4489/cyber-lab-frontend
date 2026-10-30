# Architecture

## Current implementation and delivery checkpoint

The Next.js application lives at this repository root (`src/app`). The
independent sibling `../cyber-range-backend` owns accounts, persistence, scoring,
the lifecycle queue, and the Docker-owning worker. The frontend owns
presentation and the server-only browser-facing backend-for-frontend (BFF).

Phase 1 on 2026-10-23 makes the default learner experience an isolated preview:
username-only entry, local identity and navigation, 12 editorial samples,
briefings, bookmarks, and sample recommendations. Phase 2 adds simulated session
controls and once-only demo completion. Phase 3 connects dashboard progress,
fictional rankings and read-only preview Profile to shared browser-local progress.
Learning Paths remains a placeholder. Explicit live mode retains the existing real login, email forms,
catalog, and lab controls through server-only adapters. Neither mode establishes
hosted acceptance, runtime isolation, or production launch readiness.

**The mock-preview contract was approved on 2026-10-23. All four local delivery
phases are complete; replacement-VM fixture acceptance passed on 2026-10-26.
Production gates remain open. The user replaced the Cookie Monster milestone
with harmless Welcome testing; its replacement contract diff was approved on
2026-10-26. Phase 1 accounts/catalog and Phase 2 local spawn/running acceptance
are complete; Phase 3 submission/persistence awaits approval.**
The approved specification is in the backend's [API contract](../cyber-range-backend/docs/API.md).
It supersedes the older frontend-only assumptions about Better Auth, database
ownership, lifecycle states, quotas, routing, flag storage, and missing backend
implementation. `docs/PLAN_HISTORY.md` retains historical delivery evidence, not a second API
contract.

The approved replacement milestone uses a static Welcome target, real BFF
login/lifecycle/submissions and persisted dashboard/Profile/database rankings.
Welcome displays `FLAG{WELCOME_TO_CISCO_FAMILY}` and awards 10 points once.
It contains no vulnerability or exploit. A server-controlled development/test
exception applies only to Welcome; all other labs retain dynamic flags, and
production rejects the Welcome test settings. Ownership and expiry checks are
unchanged. Phase 1 implements the backend's validated local test settings and
conditional catalog seed, plus real live learner identity and Welcome briefing.
Phase 2 adds a digest-pinned static Welcome image and worker-only runtime
injection for the exact Welcome ID. The API verifier remains unchanged until
Phase 3. The live session owns no runtime credentials: it sends validated BFF
commands, revalidates remembered IDs as the current owner and reveals a URL only
while running with time remaining. Account changes cancel stale operations and
remount the session. Lost responses reuse mutation keys; storage failures retain
same-tab control. The real local acceptance used a separate isolated target VM,
two configured node slots and distinct learner/target cookie hostnames.
Future submission drafts remain preserved outside Phase 2 commits.
The delivery keeps preview as the default and adds no backend API shapes. Planned frontend
`/api/profile` and `/api/leaderboard` reads forward existing generated DTOs,
validate responses and retain the preview-first 404 gate. Live errors never
fall back to demo identity or scores. The six approval checkpoints are in
`PLAN.md` and the backend contract. Local browser acceptance requires different
cookie hostnames for learner and target; different ports are insufficient.
Actual catalog/runtime schemas live in the backend. The frontend's YAML-only
Cookie Monster sketch and old authoring layout are not executable manifests.

## Preview and live boundaries

The server selects `FRONTEND_MODE=preview|live`, defaulting to `preview`.
Only an explicit valid `live` setting enables backend access; invalid
configuration fails closed. No browser-controlled value can switch modes.

```text
Preview: Browser -> frontend fixtures / validated local store -> simulated UI

Live:    Browser -> Next.js BFF -> Backend API -> PostgreSQL / lifecycle intent
                                      Worker -> Redis / mTLS -> isolated lab host
```

In preview mode, catalog pages, briefings, recommendations, saved labs,
navigation, and sign-in use the existing 12 editorial samples and local demo
identity. `/login` and `/signup` share username-only entry; verification and
password-reset pages explain the simulated account boundary and collect no
credentials for processing. Session routes simulate lifecycle states without a
target URL or flag and provide "Finish demo" completion with once-only demo points.

All backend-facing frontend `/api` handlers return HTTP 404 `NOT_FOUND` before
credential access, cookie resolution, or upstream requests. This includes the
catalog and maintainer backend-status check as well as auth, email, lifecycle,
and submission endpoints. Server-rendered pages must also avoid backend reads.
`/instances` returns 404 even if `LIVE_INSTANCE_UI` is set. Existing backend
configuration or a live-session cookie cannot authorize a preview action.

The built-preview acceptance script uses a reachable loopback upstream tripwire,
populated backend settings, blocked browser API/external calls and an old valid
sealed cookie. It verifies page renders and direct API/operator 404s, with no
upstream calls or live-cookie creation/mutation. CI runs that gate alongside
separate preview/live browser configurations. The live fixture allows only its
loopback port to be overridden for local OS reservations; no test value changes
an application's server mode or backend origin.

Explicit live mode retains the current integrated behavior and its separate
test configuration. `/instances` additionally requires `LIVE_INSTANCE_UI`.
API errors never cause a live screen to silently substitute fictional data.

## Local demo state and interface design

Preserve the current green-accented visual system, local Geist fonts, shared
primitives, light/dark/system themes, keyboard navigation, and reduced-motion
support. Keep route files thin and components/styles beside their features.

Preview state is versioned and Zod-validated. The existing learner store uses
`ciscoku:learner:v1` with a version 2 payload; reads migrate valid usernames and known
completions while discarding legacy active simulations. Preserve bookmarks
under `cyber-range:saved-labs:v1` and theme preference under `ciscoku:theme`.
Phase 2 mock sessions permit one active instance, use absolute expiry
timestamps, start with 60 minutes, and extend by 30 minutes up to two hours after
creation. Refresh does not restart the timer; expired sessions cannot be completed.
Web Locks serialize commands across supported same-origin browser tabs; storage
failure falls back to the current tab. Validated instance/mutation/submission
DTOs follow the generated contract. Mutation retries retain their operation ID
and return the current instance state. Completion records points once per lab;
replay returns zero additional points. No flag is produced or submitted.
Each demo entry rotates an internal local identity nonce. Commands capture it
before queueing and recheck it under the lock, so sign-out, reset and reentry
cancel stale actions even when the same username is reused.

Preview sign-out clears active simulations but retains progress. Explicit reset
clears learner progress. A different username starts fresh. Invalid storage
recovers safely; blocked writes leave the tab usable with a visible warning.
Phase 3 connects demo totals, rewards, dashboard, fictional leaderboard, and
read-only Profile to one progress selector over validated known completions.
Completed-lab lists, topic counts, levels, daily activity and existing illustrative
milestones share those records. Recommendations prefer unfinished samples;
replay earns no extra XP. Fictional rows remain distinct when usernames match,
and equal XP shares a displayed rank. Profile adds no account settings or backend
requests; its explicit-live route retains the existing honest placeholder.
Learning Paths remains a labeled preview. No local value grants backend authority.

Fixtures use generated public contract types and matching runtime validation;
editorial fields and demo provenance stay separate from backend DTOs. Do not
invent production API fields or display fixture provenance as a database read.
There are no real learning tasks, vulnerable applications, flags, or solve
instructions in this preview.

## Live authentication and API contract

Backend accounts use Argon2id passwords, hashed opaque sessions, player/admin
roles, email verification, and single-use reset/verification tokens. Better Auth
and frontend-owned database access are not the implemented architecture.

The BFF exchanges credentials/session tokens using a dedicated backend
bootstrap credential. It stores the opaque session in an encrypted HttpOnly
cookie and resolves it server-side before signing a short-lived scoped service
token with `sub` and `sid`. The backend rechecks session ownership/liveness,
account status, role permissions, and resource ownership. Browser requests
never select the acting user. Mutations enforce origin checks; BFF responses
are no-store. Public signup remains closed.

The backend generates OpenAPI from its Fastify/Zod route schemas at
`GET /v1/openapi.json`. Frontend types are committed under
`src/features/backend/generated/openapi.ts`; independent handwritten wire
schemas or sibling source imports are not the source of truth. The 2026-10-23
review confirmed those generated types match the local backend's 20-path
contract. Any additional contract change requires user approval.

Backend changes enforce verified email at creation and reject nonempty
extend/delete bodies. Node capacity admission and orphan inventory cleanup
are also implemented and passed local disposable acceptance. API details and
errors are specified in the backend API contract.

## Backend lifecycle and target trust zones

```text
Trusted control plane: Next.js BFF, backend API/worker, PostgreSQL, Redis
                           |
                     Docker Engine mTLS
                           v
Separate disposable lab host: Docker Engine and isolated Traefik ingress
                           |
                           v
Hostile targets: one restricted container and isolated network per instance
```

Only the backend worker holds Docker Engine credentials. Frontend servers and
targets receive no Docker, database, Redis, or target-host management secrets.
Control-plane services never share a host with hostile targets in the required
deployment topology. Disposable fixture success does not establish production
firewall or trust-zone enforcement.

The implemented HTTP lifecycle uses `pending`, `provisioning`, `running`,
`stopping`, `stopped`, `failed`, and `expired`. Create, extend, and destroy return
202 with instance state, operation ID, and replay indicator. The API persists
intent and idempotency records; the worker delivers operations through BullMQ.
A database uniqueness constraint prevents more than one active instance per
account. Current worker maintenance uses process intervals to create persisted
expiry/reconciliation operations; it is not the previously described BullMQ 6
Job Scheduler implementation. The dependency is BullMQ 5.

The single worker targets one registered lab node. It uses reviewed pinned
runtime manifests, non-root execution, dropped capabilities, no-new-privileges,
default seccomp/AppArmor, read-only roots, bounded resources, and isolated
networks. It polls health before marking a target running. The owner-only URL
is `LAB_PUBLIC_BASE_URL` plus `/labs/<unguessable-route-key>/`; current routing
uses Traefik file-provider documents, not per-instance subdomain labels.
Production route delivery uses the worker's authenticated Docker channel.

Implemented flags are HMAC-derived per user, challenge, and instance and injected
only at runtime. The proposed Welcome-only local test exception is specified in
the backend contract; it is not yet implemented. Expected and submitted flag
values are never persisted or logged.
Scoring transactions award fixed challenge points once per user/challenge.
Decaying scores, hints, global first-blood recognition, and flag-sharing review
are future work. Real submissions require an owned running, unexpired instance.

Phase 2 capacity admission counts reservations and outstanding resources until
confirmed cleanup under a per-node database lock. Explicit worker capacity is
required; excess spawns fail asynchronously with `node_capacity_exhausted`.
Read-only inventory fails closed on missing or ambiguous ownership evidence.
Phase 3 orphan cleanup validates complete database/inventory evidence and every
candidate before recording audit starts and deleting missing/terminal resources.
It preserves active instances, unrelated resources and trusted ingress; aborts on
unavailable evidence; retries partial failures; and confirms absence and unchanged
terminal intent before releasing reservations. One execution gate serializes
sweeps with lifecycle execution and drains during shutdown, including startup.
Multiple workers and multi-node
scheduling remain deferred.

## Verification and launch limits

The current delivery targets local development and disposable isolated fixtures.
Frontend preview tests must run without the backend, including with backend
variables deliberately populated. Existing live integration tests explicitly
select live mode. Backend database/Redis tests use disposable services; real
runtime acceptance additionally requires the isolated worker/ingress fixture.
Missing infrastructure blocks that acceptance milestone.

After each numbered phase, the lead reports changes, test instructions/results,
and open questions, updates the canonical documents, and pauses for approval.
Production email, hosting, policies, backup/rotation/incident exercises, and
host-level egress anomaly monitoring remain open launch gates. `SECURITY.md`
continues to govern target isolation; preview success never authorizes signup
or a public deployment.
