# Development Plan: CiscoKU Lab

## Harmless Welcome lab: Phase 2 runtime verified (October 26, 2026)

The user replaced the Cookie Monster milestone with harmless end-to-end testing.
Confirmed choices: the exact shared `FLAG{WELCOME_TO_CISCO_FAMILY}`, local
Windows control plane plus the retained isolated Linux VM, and 10 points once.
Welcome openly displays the flag; it contains no vulnerability, exploit, attack
payload or sensitive security content. Public signup and hosted changes remain
outside scope.

The approved replacement contract is in `../cyber-range-backend/docs/API.md`,
under "Approved replacement delivery: harmless Welcome lab". **The user approved
the actual documentation diff on October 26, then Phases 1 and 2.** This
supersedes the earlier Cookie Monster delivery approval.
Preview stays the server default; actual tests explicitly select live mode.

| Checkpoint | Frontend agent: this repo only | Backend agent: sibling only |
|---|---|---|
| 1 — Accounts and catalog | Real login/identity, refresh/logout, Welcome listing/briefing; honest unfinished live views | Development/test-only Welcome configuration and explicit disposable catalog seed; two verified learners |
| 2 — Spawn and running | Spawn Instance, pending/running states, target link, refresh-preserved lifetime | Harmless runtime-injected Welcome page, pinned image/manifest, isolated VM/preflight, idempotent creation |
| 3 — Submission and persistence | Correct/incorrect/repeat outcomes; validated profile/leaderboard BFF and live progress | Welcome-only fixed-flag policy, owner/expiry enforcement, once-only 10-point scoring and persisted history |
| 4 — Two-user isolation | Independent browser sessions and foreign-resource denial | Distinct resources, benign controlled health requests, stop A while B remains usable |
| 5 — Expiry and cleanup | Expiry/stop/retry states and inactive submission denial | Actual removal, route 404, capacity refusal/retention and controlled cleanup retry |
| 6 — Regression and replacement readiness | Full harmless browser flow, preview isolation, responsive/theme/keyboard checks | Disposable-service gates, final absence evidence and future dynamic-flag compatibility |

Report changes, test instructions/results and open questions after each numbered
checkpoint; update canonical docs and pause for approval. The lead owns contract
coordination. No new dependencies or independent agent contract edits. Preserve
the unrelated hosting-history edit below and the existing uncommitted frontend
work. Generic auth/lifecycle/submission changes can be reviewed for reuse;
Cookie Monster-specific content is excluded from Welcome acceptance. The prior
future submission drafts remain outside this phase's commits. Phase 1 did not
include a target; Phase 2 below enables launch while submission stays unavailable.
Earlier delivery evidence remains historical; production launch gates stay open.
Source commits are `f4ca8ce` (real live learner identity) and `dd942c0`
(harmless Welcome briefing and dedicated fixtures); no push was made.

Phase 1 implements real live-mode account identity across navigation, home and
dashboard, refresh/logout and account-change cancellation. Public signup routes
to operator-account login; unfinished profile/rankings show honest placeholders.
Welcome has a neutral illustration, a harmless briefing and a disabled Spawn
Instance action. Direct session navigation returns to its briefing. The backend
adds validated development/test-only settings and an opt-in, history-preserving
Welcome catalog seed; production rejects the presence of either test setting.

Verification: lint, typecheck, production build and BFF smoke passed. Unit tests
passed 119 workspace cases (115 in the committed Phase 1 source; four belong to
preserved future submission drafts). Browser checks passed 57 preview and 87
explicit-live cases across desktop/mobile/tablet. Three obsolete live-copy test
expectations were updated; a stale sign-in recovery regression was fixed and
covered before the final clean live run. The final built-preview isolation check
observed 30 page visits, 28 API 404s, two operator 404s, zero upstream/browser API/
external calls, zero page errors and no live-cookie changes. The earlier 57-case
preview run preceded the final live-only fixes; isolation was rechecked afterward.

Independent browser acceptance used the built frontend, real compiled API and a
fresh disposable PostgreSQL database with two verified learners: wrong-password
401, login 200, HttpOnly cookie, Welcome-only 10-point catalog, refresh identity,
disabled launch, direct-session redirect, logout 204 and revoked sessions all
passed. No target or email was created, no later-phase API was called, and no
unexpected browser outbound request occurred. Its temporary database was removed
and frontend/API ports closed. Backend acceptance passed all 232 tests with no
skips. Generated types exactly match all 20 existing API paths. One combined
visual review of 24 entry/home/briefing/guide captures in three viewports and two
themes found no defects; no confirmation pass was needed. Evidence is retained
in the task artifact folder's `welcome-phase1-qa`.
Final backend fixture cleanup also confirmed no owned database processes,
clusters, Redis containers or private connection-state files remain; fixture
ports are closed and the VM stayed off.
An in-memory TypeScript check also passed for the approved source snapshot with
the preserved session/submission drafts replaced by committed baseline files or
excluded. Phase 1 does not depend on that future work.

To repeat locally, follow the sibling `docs/LOCAL_DEVELOPMENT.md` Welcome setup
with a disposable database and two verified operator accounts, then select
explicit live frontend mode. Exercise login, Labs/Welcome, refresh, direct
session navigation and logout. Keep the worker/VM off for this checkpoint.
There are no unresolved Phase 1 questions. **Pause for approval of Phase 2:
actual harmless target spawning/running on the isolated VM.** Scoring and live
progress remain Phase 3; no hosted deployment or production acceptance is claimed.

The user approved Phase 2 after the report above. It implements live
spawn/preparation/running/stop controls, readiness-only links, refresh-preserved
absolute expiry and bounded extension. Account changes discard stale requests;
owner validation precedes showing restored instances. Lost responses reuse
idempotency keys and storage denial keeps same-tab control. The static Welcome
target lives in the sibling backend, runs nonroot with a read-only filesystem,
and receives its public placeholder at runtime. API shapes are unchanged.

Phase 2 verification passed lint, types, production build, BFF smoke, 125 unit
tests (121 current-scope cases plus four preserved future-draft cases), and
108 explicit-live browser cases across desktop/mobile/tablet with zero skips or
flaky cases. All 57 preview cases passed before the final live-only copy fix;
the final build's preview isolation gate passed 30 visits, 28 API 404s, two
operator 404s, zero upstream/browser API/external calls or page errors and no
live-cookie changes. Generated types match all 20 backend paths. A read-only
TypeScript check passed 163 root files while excluding all future submission
drafts and using the committed stylesheet, proving no dependency on that work.
Backend gates passed all 247 tests without skips. One clock-test setup issue
was corrected before the clean 108-case run; application deadlines were not
relaxed. Final lint/types and one focused mobile browser confirmation also pass.

Real acceptance connected the built frontend to a fresh database, compiled API,
worker and the retained private-only Linux target VM after fresh mTLS/preflight
checks. Creation returned pending without a URL; three concurrent same-key
retries reused one instance/operation. Pending and running refresh kept the
60-minute initial expiry and two-hour absolute cap. Exactly one managed target,
network and route existed on the two-slot node. The target displayed the exact
public placeholder; its health response contained no flag and no learner cookie
reached it. Runtime limits and absence of a baked image flag were checked.
Stopping removed the resources and returned route 404. No submission, scoring,
email, later-phase call or unexpected outbound browser request occurred.
An initial acceptance helper used the wrong TLS server name; only that ignored
helper was corrected before a fresh, successful run. This was not an app fix.

The combined visual pass covered 33 captures: entry/session states across three
viewports and both themes, plus the actual target in three viewports. One mobile
dark-link capture raced theme painting; theme/foreground synchronization in the
test and the single confirmation pass showed a readable link without CSS changes.
Evidence is retained under the task artifact folder's `welcome-phase2-qa`,
including `live-browser-report.json` and `real-spawn-browser.json`.

To repeat, use the sibling `docs/LOCAL_DEVELOPMENT.md` Welcome runtime setup with
disposable accounts/services and a fresh isolated-node preflight. Select explicit
live frontend mode; sign in, open Welcome, Spawn Instance, refresh pending and
running, open the assigned page, extend and stop. Verify route/resource absence.
Submission, scoring and live progress are Phase 3. There are no open product
questions. **Pause for approval before Phase 3.** No hosted deployment or
production-readiness claim is made.

Final cleanup: the target, network and route, acceptance database/role, API,
worker, frontend, private runtime files and tunnel were removed/stopped. The
retained target VM is confirmed powered off. The shared test PostgreSQL process
was already stopped; its verified owned cluster/state were removed after PID
and closed-port checks. Redis' loopback port is closed, but Docker Desktop is
not responding to inventory requests after restart; its retained owned-container
state is preserved until inventory/removal can be confirmed. Windows is locked,
so UI inspection stopped and the user was asked to unlock it. This final cleanup
check remains open; Phase 3 has not started.
Frontend source is split into `0e76aa2` (session safeguards) and `83ba5ce`
(Welcome launch and browser fixtures). No push was made.

## Mock preview and lifecycle hardening delivery (October 23, 2026)

The user approved a new delivery direction: make the entire learner preview
mock-only, including username-only sign-in and simulated sessions completed by
a "Finish demo" button. Keep the current visual design and dependencies.
Retain explicit live mode for separate integration tests; default preview must
never call the backend, even when backend configuration is present.

**Checkpoint: contract approved on October 23; all four local delivery phases are complete. Replacement-host lifecycle, cleanup and isolation acceptance passed October 26. Pause before the separate playable-CTF milestone.**
The approved boundary and backend semantics are in
`../cyber-range-backend/docs/API.md` and the reconciled `ARCHITECTURE.md`.
Exactly two implementation agents are authorized: frontend-only changes in this
repository and backend-only changes in the sibling. Neither agent may change
the contract independently. Report changes, tests and open questions after each
phase, update existing documentation, and pause before starting the next phase.

| Phase | Frontend | Backend |
|---|---|---|
| 1 | Server-only preview/live boundary; local username navigation and sample catalog/briefings | Verified-email spawn enforcement and empty-body command validation |
| 2 | Simulated lifecycle, absolute countdown, extension, completion and replay | Node capacity migration/configuration and retry-safe admission |
| 3 | Consistent local progress, fictional rankings, read-only Profile and guide | Serialized inventory-to-database orphan cleanup with safe retries/audit |
| 4 | Separate preview/live test configurations and responsive/accessibility checks | Disposable-service and isolated-worker acceptance, including isolation probes |

Phase 1 verification: frontend lint, typecheck, 86 unit tests, production build,
BFF smoke, and all 99 browser checks passed (21 preview and 78 explicit-live,
across desktop, mobile, and tablet). The final browser run also confirmed the
username field waits for local-state readiness, preventing lost early input.
The operator route has a request-level gate because a page-level not-found can
otherwise stream HTTP 200. An independent built-preview check visited 15 pages,
exercised all 14 backend-facing API methods with an old valid sealed cookie,
and observed zero upstream, browser API, external requests, or page errors.
The operator returned 404 even with `LIVE_INSTANCE_UI=true`. Generated types
exactly match the backend's current 20-path contract.

Backend lint/typecheck/build passed; a fresh disposable PostgreSQL 18 suite
passed 160 tests with six environment skips (five Redis queue cases and one
OpenSSL-dependent TLS case). The final focused security/ownership rerun passed
all 19 tests. Both temporary clusters were removed; the demo database was not
migrated or modified. No real target, email, or hosted service was created.
Backend implementation is recorded in local commit `9855839`; no push was made.

The user approved Phase 2 and clarified the product goal: a playable web CTF
platform where each learner can spawn a private web challenge. "VM" here means
the isolated web lab, consistent with the existing Docker target architecture.
Mock sessions are an intermediate milestone. Phase 2 implements their controls
and completion alongside backend capacity limits, followed by a report and pause.

Phase 2 verification: frontend lint/typecheck/build, BFF smoke, 103 unit tests,
and all 117 browser checks passed (39 preview and 78 explicit-live). These cover
refresh-persistent expiry, initial/extended/absolute limits, once-only completion
and zero-point replay, migration, sign-out/reset, malformed or denied storage,
cross-tab starts and stale queued commands after identity changes, including
same-username reentry. The combined desktop/tablet/mobile light/dark visual pass
found no layout issues. An internal local sign-in nonce cancels queued work;
it is not a backend credential. No preview action creates a target or flag.

Backend lint/typecheck/build passed with 185 tests passing and five Redis queue
tests skipped. Capacity migration `ca700b8` and behavior `b888b9b` are separate
commits. An independent existing-node upgrade test confirmed backfill to one
slot and positive-value enforcement. Read-only Docker/router fixtures cover
partial and orphan resources, duplicate or stripped labels, and failed reads;
real isolated Docker/Redis acceptance remains open for Phase 4. The disposable
PostgreSQL cluster was stopped and removed without touching the demo database.
Generated frontend types exactly match all 20 current backend paths.

Phase 3 was approved on October 24 and is complete. Dashboard, read-only preview
Profile and fictional rankings use the same validated local progress selector.
Completed labs, totals, topic counts and existing illustrative rewards agree;
recommendations prefer unfinished samples. Completion and guide links connect
the screens. Learning Paths remains a preview; the explicit-live Profile keeps
its honest placeholder. No API or storage-schema change was needed.

Phase 3 frontend verification: lint/typecheck/build, BFF smoke, 111 unit tests and
all 135 browser checks passed (57 preview, 78 explicit-live). Cases cover actual
completion/replay across views, sign-out/reentry, reset with bookmarks/theme
preserved, malformed completion data, duplicate fictional usernames and temporary
same-tab progress when storage writes fail. One combined visual pass covered
Profile/dashboard/rankings in desktop/tablet/mobile and light/dark, including
long names, keyboard skip focus and reduced motion. All 18 captures are retained
under the task visualization folder's `phase3-progress-qa`; no fixes or second
visual pass were required.

Backend cleanup is recorded in `d9823fe`: complete database/inventory validation,
all candidate checks and audit starts precede deletion; active instances,
unrelated resources and trusted ingress survive; partial failures retry without
premature capacity release. Sweeps and lifecycle execution share one gate, with
shutdown drain during startup and later maintenance. Final lint/typecheck/build
and whitespace passed; an exact-source disposable PostgreSQL/TLS run passed 215
tests with five Redis cases skipped. A transient readiness timeout under load
was resolved by focused reruns and two-worker execution without relaxed timeouts.
Generated frontend types exactly match all 20 backend paths. The fresh database
cluster was stopped and removed. Docker Engine was unreachable; Engine/router
fixtures do not substitute for real isolation evidence.

Phase 4 was approved October 25 and completed local acceptance October 26.
Final frontend lint, typecheck, production build, BFF smoke and all 113 unit
tests passed. The clean
browser suites passed 135 checks in serial runs: 57 preview and 78 explicit-live.
The initial preview run crossed a host interruption; its two affected desktop
cases and the clean preview suite passed with unchanged source/time limits.
Windows then refused fixture port 4101 before any live test ran. A validated,
test-only `BACKEND_FIXTURE_PORT` override retained loopback binding/default 4101;
all 78 live checks passed on an OS-selected available port. Both test listeners
were confirmed closed afterward. No frontend application source, generated DTO,
dependency or lockfile changed.

The new repeatable `npm run test:preview-isolation` gate is also in CI. With
backend settings populated, a reachable upstream tripwire and blocked browser
API/external calls, it passed 30 page visits, all 14 API methods in both anonymous
and old-live-cookie cases (28 no-store 404s), both operator 404s with live UI
enabled, and simulated start/extend/finish/replay/stop. It observed zero upstream,
browser API or external requests/page errors, and no live-cookie creation or
mutation. Enhanced keyboard checks cover entry, session controls, progress links,
mobile focus containment/Escape and reduced motion. One combined visual review
of all 33 final preview captures covered desktop/tablet/mobile, both themes,
entry, sessions, briefings and progress; no UI fixes or confirmation pass were
needed. Captures and interrupted-run diagnostics are retained in the task's
visualization folder.

Backend final lint/typecheck/build/whitespace and all 222 tests passed with zero
skips on disposable PostgreSQL 18.3/Redis 7.4.11 and the local TLS fixture, using
Node 24.19.0 and one worker with standard isolation/deadlines. The real Redis
run found a fast-worker delivery race; `5a1fbfc` fixes claiming an already
delivered pending operation before its queued marker. Two regressions cover
delayed marking and producer failure after enqueue. Generated frontend types
still exactly match all 20 backend paths. No API shape or schema changed.

The user confirmed the old two VMs were deleted and chose a fresh target-only
Linux VM with the control plane on Windows. At the October 25 checkpoint the
guarded start found only about 1.5 GiB free, below the 2.5 GiB requirement, and
left it powered off. Disposable services and credentials were removed then;
no replacement-host acceptance was claimed. Service/fake-runtime tests were not
treated as substitutes for real target checks.

On October 26 the user resumed VM testing and explicitly authorized closing
Roblox and Discord to free memory. Ubuntu 26.04.1 Server installed successfully
on the target-only VM. Its tested configuration uses one CPU, 2 GiB RAM and a
32 GiB dynamic disk. Docker 29.9.2 advertises user namespaces, seccomp, AppArmor
and private cgroup namespaces. Actual Engine mTLS accepts the worker identity
and rejects missing client credentials, an untrusted CA and a wrong hostname.
The temporary internet adapter was removed before target testing; private-only
networking has no default route. Constrained digest-pinned ingress and the
committed disposable HTTP fixture were prepared. The API, single serialized
worker and fresh disposable PostgreSQL/Redis fixtures ran on Windows, separate
from the existing demo database.

Real HTTPS create/idempotency, solve scoring (10 then zero), extension, stop,
expiry, concurrent node capacity, two-player ownership and mid-spawn crash
recovery passed. Recovery reused the exact container and network without
duplication. Both application-created targets passed runtime restriction and
IPv4/IPv6/default-deny/cross-instance probes, with positive ingress/management
baselines and actual bridge address inspection. Full and partial orphans were
cleaned once; unrelated resources and trusted ingress survived. Cleanup failures
retained capacity until absence was proven. Failed database/inventory/ownership/
audit evidence prevented destructive work and recovered safely.

The disposable ingress mount layout was corrected without changing application
source. An incomplete crash-harness attempt was retained and repeated with an
immediate pre-verified worker kill. All required acceptance then passed with
unchanged product timeouts and no new dependencies or contract changes. The
backend gate record gives exact scope and the loopback-only control-plane
limitations. Twenty-three sanitized runtime observations are retained alongside
the frontend captures in the task visualization folder.

Final managed containers/networks/routes, active intents, reservations and
pending operations were zero. API/worker drained; the runtime database/restricted
login/private credentials, PostgreSQL cluster and Redis fixture were removed
and listeners closed. The ingress tunnel closed and the installed VM remains
powered off to release memory. Phase 4's local checkpoint is complete. Preview
behavior and hosted configuration are unchanged; commits remain local. No later
phase has started, and production launch gates remain open.

After these four delivery phases, plan a separate live CTF milestone: author a
reviewed beginner web challenge and solve check; connect real learner sessions,
flag submissions and persisted progress; provision and verify isolated worker
and ingress connectivity; and exercise login, spawn, solve, scoring, expiry and
cleanup through the hosted frontend. The intended endpoints supplied by the user
are https://cyber-lab-frontend.vercel.app and
https://cyber-range-api.onrender.com. Their existence alone does not prove worker
reachability or playable targets. This milestone is not implemented or approved
for deployment by the current mock-first delivery approvals.

Scope is local development and disposable fixtures. Real CTF content, admin
tools, advanced access/scaling, hosting work, and host-level egress anomaly
monitoring are deferred. Public signup stays closed; deferred monitoring and
production security/operational requirements remain launch blockers. Missing
isolated infrastructure blocks its acceptance checks rather than being replaced
by mock evidence.

The live API integration and older UX/platform sections below are historical
checkpoints. Their phase numbers describe earlier roadmaps, not the four phases
in this delivery. Their implementation evidence remains useful; instructions to
continue live learner integration are superseded by this preview direction.
The default experience is now isolated preview; explicit live mode retains the
earlier integrated behavior and honestly labeled unfinished demo screens.

## Approved live API integration (October 2026)

This integration supersedes the demo-only delivery boundary below. The backend
reference is `../cyber-range-backend`, which remains read-only. Preserve the
current visual design and convert features in separate, independently tested
pushes, waiting for CI between groups:

1. Consolidate the typed HTTP transport and shared error handling.
2. Connect login, session restoration, logout, email verification, and password
   recovery through the same-origin BFF. Public signup stays closed.
3. Connect the database catalog and start/poll/extend/stop lab sessions.
4. Connect flag submissions, dashboard progress, and the current-player profile.
5. Connect the public database leaderboard and finish live acceptance.

Confirmed policies: hide UI fields absent from the API; poll transitions every
2 seconds and running instances every 15 seconds without overlapping requests;
remember only returned instance/challenge IDs locally and revalidate ownership;
clear remembered instances on logout or terminal states; require verified email
server-side before creation. Configure the local backend auth limit to 60/minute
for polling, and honor rate-limit backoff. Never use demo state as authorization,
fall back to fictional data on API failure, or infer cross-device instance
discovery from the available API.

The server transport consolidation is pushed as `c29d6f7`; GitHub CI passed.
Real login, session restoration, logout, verification/reset BFF forms, and the
verified-email creation guard are implemented. Fixture browser coverage and
server-boundary tests accompany them. Authentication is pushed as `1a2a78f`;
GitHub CI passed. Live authentication acceptance passed against the running
backend with a disposable verified player: login, HttpOnly SameSite cookie,
session restoration after refresh, and logout. Test credentials remain in an
ignored local environment file, never in source or browser code.

The database catalog, backend briefings, bookmarks, published home recommendations,
and learner start/poll/extend/stop controls are implemented. Browser coverage uses
a loopback backend fixture: session restoration, target URL gating, stop cleanup,
storage denial, and retained idempotency keys after a lost create response. These
checks verify the frontend boundary, not a real isolated worker or target.

### Categorized delivery checkpoints

Each row was committed and pushed separately after local verification, with
GitHub CI required before the next push. Feature tests live with their feature.

| Commit | Category | Debugging boundary |
|---|---|---|
| `34eb4aa` | Browser API-client refactor | Instance requests reuse shared error/response handling. |
| `084941b` | Catalog contract refactor | Shared runtime schemas; no adapter behavior change. |
| `0c08366` | Learner labs feature | Published catalog/briefings, recommendations, lifecycle UI, and browser coverage. |

Local feature gates passed: lint, typecheck, 74 unit tests, production build,
loopback BFF smoke, and 78 browser tests across desktop, mobile, and tablet.
Real-backend authentication acceptance passed again against the feature build.
The following documentation push updates this checkpoint separately from code.
Use `git show --stat <commit>` to locate a change; do not log credentials,
cookies, service tokens, reset links, or flags while debugging.

Remaining integration work: replace demo navigation/dashboard identity with the
backend account; connect submissions, progress/profile, and the database
leaderboard; finish real worker/ingress acceptance. Public signup stays closed.
Never interpret fixture lifecycle success as production launch readiness.

The server transport consolidation is implemented. Existing feature wrappers
retain their interfaces and response validation. Live lifecycle acceptance still
needs a prepared isolated worker/ingress with a reviewed runtime manifest. API
readiness and disposable-player authentication were verified separately. The
default API origin is `http://127.0.0.1:4000`.

## CiscoKU Lab: approved UX implementation (September 2026)

This section records the historical demo delivery; the live integration above
supersedes its demo-only boundary. The platform
architecture and numbered backend phases below remain future work. The user
authorized implementation after discovery: this delivery is a clickable mockup,
with no real accounts, payments, challenge internals, or lab execution.

### Discovery summary

| Decision | Confirmed direction |
|---|---|
| Identity | CiscoKU Lab; original temporary wordmark and small symbol |
| Audience | Mixed university learners, mainly 18–24; beginner through advanced |
| Access | Free; guests browse catalog and briefings; demo username before starting |
| Language | English first; keep copy ready for future translation |
| Personality | Friendly, game-like, spacious; TryHackMe and Hack The Box references |
| Visuals | Green accents; light/dark toggle follows system initially; clean sans with mono accents |
| Navigation | Home, Labs, Learning Paths (preview), Leaderboard, Profile (preview) |
| Home | Balanced learning recommendation, browsing, and progress overview |
| Catalog | 12 mock entries; web, Linux, networking, cryptography, forensics; Easy/Medium/Hard |
| Cards | Title, topic, difficulty, estimated time, reward |
| Briefing | Objective, prerequisites, time, difficulty, skills, rewards; placeholder metadata only |
| Simulation | Start Lab immediately opens a running status panel with a timer; simulated Finish Lab |
| Progress | Mock XP, levels, badges, completions, skill progress, streak, daily goal |
| Leaderboard | Global sample XP and rank with fictional usernames |
| Persistence | Browser-local mock profile, progress, instance state, and theme preference |
| Delivery | Existing Next.js/TypeScript/Tailwind app, Chrome desktop and tablet; Vercel preview target |
| Constraints | Solo now, possible small team later; small personal budget; no fixed deadline; 3–5 hours/week |

### Users and goals

* New learner: understand what a lab teaches, choose an approachable starting
  point, and complete the first simulated session without unexplained jargon.
* Returning student: see progress, resume a running session, and receive one
  clear recommendation for the next lab.
* Experienced learner: filter by topic/difficulty and compare mock XP on the
  leaderboard without a lengthy onboarding flow.

Long-term success means private runnable labs, learner improvement, and many
concurrent users. This mockup validates the journey; it cannot validate runtime
isolation, capacity, real authentication, or learning outcomes.

### Pages and flows

| Page | Purpose |
|---|---|
| `/` | Guest introduction; returning demo learner overview |
| `/signup` | Username-only demo entry, with a clear local-data explanation |
| `/dashboard` | Next recommendation, active sessions, mock rewards and progress |
| `/labs` | Search, filter, sort, bookmark, and browse 12 entries |
| `/labs/[slug]` | Public sample briefing and Start Lab action |
| `/labs/[slug]/session` | Running, expired, and completed simulation states |
| `/leaderboard` | Fictional global ranking plus the current demo learner |
| `/paths`, `/profile` | Honest preview destinations with a route back to Labs |
| `/saved`, `/guide` | Retained supporting routes; no lab internals |

Guest flow: Home → Labs → Briefing → username → original briefing → Start Lab.
Learner flow: Home/Dashboard → recommendation or active session → Finish Lab →
reward and updated dashboard/leaderboard. Preview links clearly explain their
limited scope. Unknown lab slugs return 404.

### UI delivery roadmap

These are effort estimates, not deadlines. Each group is committed and pushed
separately after its checks; feature tests travel with the feature they verify.

| Group | Goal and deliverables | Done criteria | Effort |
|---|---|---|---|
| Structure | Feature folders, scoped styles, build/test CI | Existing behavior passes unchanged | 2–3 h |
| Identity | Theme controls, original mark, shared navigation | Chrome desktop/tablet; light/dark and reduced motion work | 4–6 h |
| Discovery | Catalog, 12 metadata fixtures, guest landing and briefings | Combined filters, empty state, bookmarks, 404 work | 4–6 h |
| Demo learner | Username entry, persistent state, dashboard | Refresh, sign out/re-entry, storage recovery work | 4–6 h |
| Lab simulation | Start, countdown, expiry, finish, rewards | No network execution; completion awards once per lab | 4–6 h |
| Community preview | Fictional leaderboard; paths/profile placeholders | Rankings update from demo progress; preview links are clear | 2–3 h |
| Verification | Full browser flow, visual review, documentation | Lint, types, build, browser tests, desktop/tablet review pass | 3–4 h |

Total planning estimate: 23–34 hours, roughly 5–12 weeks at the stated pace.

### Design direction

Option A, recommended and implemented: a friendly learning workspace with
spacious cards, soft green surfaces, readable typography, clear primary actions,
and restrained progress rewards. Option B: a more terminal-like treatment with
stronger mono accents. A best matches the confirmed beginner-friendly direction;
technical accents stay small. Theme colors must carry meaning through text/icons
as well as color, with visible focus and reduced-motion support.

### Mock fixtures and state boundaries

Use 12 metadata-only entries across the five selected categories. Do not create
challenge narratives, tasks, flags, solve instructions, terminals, or targets.
Reuse existing sample titles where useful. Editorial rewards and durations are
illustrative fixture values, not production scoring or runtime policy.

Keep demo identity and progress in a versioned browser store with validated
reads. Derive XP from unique completions and the catalog rather than trusting a
stored total. Keep mock reward rules centralized and documented in code. A
session's expiration uses an absolute timestamp so reloads cannot restart its
timer. Multiple lab entries can have their own simulated sessions. Storage
failure must be visible and the current tab should remain usable.

The mock state never grants server access. No application API or database
schema changes are required. The existing optional backend health route retains
its server-only boundary. Do not connect simulated actions to the backend.

### UX risks and acceptance

| Risk | Mitigation / acceptance check |
|---|---|
| Mock activity mistaken for real labs or progress | Persistent demo labeling; no fabricated access URL; Finish Lab explicitly says simulated |
| Beginners face too many choices | One next recommendation; plain copy; concise card metadata; recoverable empty filters |
| Rewards or local state confuse reviewers | No duplicate XP; countdown survives refresh; clear local-storage notice; visible reset/sign-out controls |

Browser checks cover guest gating and return destination, combined filters,
bookmarks, theme/system preference, local persistence and malformed storage,
start/expiry/completion, duplicate rewards, leaderboard changes, preview routes,
responsive navigation, keyboard focus, and the unchanged backend HTTP boundary.

## Current Status

* Phase 0 - Architecture research and repository split documented
* Phase 1 - In progress: frontend preview and server-only BFF groundwork implemented
* Phase 2 - Not started
* Phase 3 - Not started
* Phase 4 - Not started
* Phase 5 - Not started
* Phase 6 - Not started

### Frontend implementation checkpoint

This is the standalone frontend, with `src/app` at its root. API, persistence,
and orchestration belong to `../cyber-range-backend`. The phases below describe
the whole platform, including planned work.

Completed UX delivery: CiscoKU Lab identity; guest landing; 12 sample lab
briefings; search, category/difficulty filters, sorting, grid/list views, and
bookmarks; demo username entry; dashboard with XP, levels, milestones, streak,
daily goal, and topic progress; simulated start/stop/expiry/finish/replay; fictional
global leaderboard; clear Learning Paths/Profile previews; system/light/dark
themes; desktop/tablet layouts; demo guide and explicit local reset.

All demo state remains in the browser. No real account is exposed through the
visible product, and no live target, target URL, flag verification, or backend
score is presented as demo data. The optional backend health check is still
server-only and does not enable labs. All 66 browser cases passed across desktop,
tablet, and mobile during UX verification, together with 69 unit tests, lint, type
checks, a production build, and a post-build loopback BFF smoke test. Feature groups
are pushed separately with GitHub CI between them.

Server-only BFF groundwork is complete for a future live product: generated
OpenAPI types and response validation; encrypted HttpOnly backend-session
cookies; same-origin mutation checks; short-lived scoped service tokens; strict
instance creation, polling, extension, and destruction routes; and strict flag
submission. These routes are no-store, never accept an acting user ID from the
browser, require the browser to retain an idempotency key for each instance
mutation, and reveal a target URL only after the backend reports `running`.
They do not connect the demo, authorize demo state, or make the preview a live
platform. CI exercises the complete protected BFF path against a loopback-only
backend fixture without using deployment credentials or creating a target.

The first live-product surface is the flagged operator instance panel at
`/instances`. It is server-gated by `LIVE_INSTANCE_UI`, returns `404` when that
value is unset, is never linked from demo navigation, and states in its own
banner that the shell's demo label does not apply to it. It drives spawn,
polling, countdown, extend, and destroy entirely through the same-origin BFF:
the browser sends only `challengeId`, generates and retains one idempotency key
per logical mutation, reuses that key on retry, renders only stable error codes,
and shows a target URL only once the backend reports `running`. It does not read
or write demo state, and it grants no capability the BFF does not already
enforce server-side. Public signup stays disabled, and no target is launched
until the backend's required security gates are complete.

Next platform work is a backend contract release and deployed BFF preflight,
followed by a deliberately separate real-auth and live-product UI decision. The
demo must not become a substitute authorization interface. Never infer backend
or launch readiness from `/healthz` alone.

## 1. Technical Architecture & Stack

Three deployables, because one of them has to talk to Docker and Vercel cannot.

**Web app** (`src/app` in this repository) — the part users see.

* **Framework:** Next.js 16 App Router with TypeScript. Same as
  financial-dashboard, so the patterns carry over.
* **UI:** Tailwind CSS with shadcn/ui. System/light/dark themes for this frontend.
* **Auth:** Better Auth, with email verification required before a user may
  spawn anything. Unverified accounts can browse but not consume compute.
* **Forms & validation:** React Hook Form with Zod.
* **Hosting:** Vercel.

**Backend API and orchestrator** (`../cyber-range-backend`) — the control plane.

* **Runtime:** Node with TypeScript, Fastify for the HTTP API.
* **Container control:** Dockerode against the Docker Engine API on each lab
  node, over TLS. Never a mounted socket.
* **Queue and timers:** BullMQ on Redis. Spawn, destroy, reap, and reconcile
  are all jobs, so a crash loses nothing.
* **Hosting:** A small VPS. Always on, because instance expiry needs a real
  timer and serverless has none.

**Lab nodes** — disposable hosts that run the vulnerable targets.

* **Runtime:** Docker with user namespace remapping enabled.
* **Ingress:** Traefik, configured by container labels the orchestrator sets.
* **Hosting:** Dedicated VPS instances, rebuildable from a bootstrap script,
  holding no state worth stealing.

**Shared**

* **Database:** Neon PostgreSQL with Drizzle ORM, owned by the backend.
  Frontend domain reads and writes go through its HTTP API. Decide the auth
  adapter's storage boundary when Better Auth is implemented.
* **Contracts:** Versioned HTTP request/response schemas. Publish or generate
  types for each independent repository rather than importing sibling source.
* **Testing:** Vitest for units, Playwright for end-to-end flows.

## 1.1 Researched stack decisions

The stack above is appropriate for the first release. These implementation
details were checked against the current primary documentation:

* **Next.js 16 App Router on Vercel** stays the web boundary. Vercel supports
  zero-configuration Next.js deployment, while the Docker-owning service stays
  outside Vercel.
* **Better Auth** fits the Next.js App Router. In Next.js 16, protected-route
  interception uses `proxy.ts`; authorization must still be enforced inside
  each server action and route handler.
* **Neon plus Drizzle** remains the database choice. Use the Neon HTTP driver
  for short web transactions and a serverful PostgreSQL driver where the
  orchestrator needs longer-lived or interactive database work.
* **Fastify plus TypeScript** is suitable for the narrow orchestrator API.
  Define route schemas and use the Fastify Zod type provider so validation and
  TypeScript types stay together.
* **BullMQ plus Redis** remains the lifecycle queue. Use BullMQ 6 Job
  Schedulers for reaper and reconciliation schedules; do not build new code on
  the removed legacy repeatable-job API.
* **Dockerode over mutually authenticated TLS** is the only Docker control
  path. The orchestrator must construct a fixed safe Docker configuration from
  a validated manifest rather than pass arbitrary user input to Docker.
* **Traefik's Docker provider** fits HTTP exposure because it discovers routes
  from container labels. Set `exposedByDefault=false` and add labels only for
  containers created by the orchestrator.
* **Vitest and Playwright** remain the test split: focused unit and contract
  tests in Vitest, then a real spawn-to-destroy browser flow in Playwright once
  Phase 2 exists.

Primary references: [Next.js](https://nextjs.org/docs),
[Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs),
[Better Auth](https://better-auth.com/docs/integrations/next),
[Drizzle with Neon](https://orm.drizzle.team/docs/connect-neon),
[Fastify TypeScript](https://fastify.dev/docs/latest/Reference/TypeScript/),
[BullMQ Job Schedulers](https://docs.bullmq.io/guide/job-schedulers/),
[Docker security](https://docs.docker.com/engine/security/),
[Dockerode](https://github.com/apocas/dockerode), and
[Traefik providers](https://doc.traefik.io/traefik/reference/install-configuration/providers/overview/).

## 1.2 Technology boundaries

Keep these boundaries when implementation starts:

| Boundary | Technology | Rule |
|---|---|---|
| User portal | Next.js, React, Tailwind, shadcn/ui | No Docker credentials or target host control. |
| Authentication | Better Auth | Verify sessions on the server for every protected action. |
| Control API | Fastify, TypeScript, Zod | Accept only narrow, validated lifecycle commands. |
| Durable work | BullMQ 6, Redis | Jobs must be idempotent and safe to retry. |
| Persistence | Neon PostgreSQL, Drizzle | Store intent and audit state; never plaintext flags. |
| Lab runtime | Docker, Dockerode, Traefik | Apply security defaults in code and on the host. |
| Future raw access | WireGuard | Add only after HTTP lifecycle and hardening are proven. |

## 2. Data Models (Database Schema)

Better Auth owns `user`, `session`, `account`, and `verification`. Everything
below is ours.

**`profiles`** — public identity, separate from the auth record.
`user_id`, `handle` (unique, shown on leaderboards), `display_name`,
`avatar_url`, `bio`, `country`, `total_points`, `created_at`.

**`challenges`** — the catalog.
`id`, `slug`, `title`, `description_md`, `category` (web, pwn, crypto,
forensics, reversing, network), `difficulty` (easy, medium, hard, insane),
`base_points`, `exposure` (http, tcp, vpn), `image_ref`, `author_id`, `status`
(draft, review, published, retired), `published_at`. `image_ref` is the pinned
image digest, never a floating tag.

**`challenge_files`** — downloadable attachments, such as a binary to reverse.
`id`, `challenge_id`, `filename`, `size_bytes`, `sha256`, `storage_key`.

**`flags`** — how a solve is checked.
`id`, `challenge_id`, `kind` (static or dynamic), `static_hash` for static
flags, `hmac_key_id` for dynamic ones. Never store a plaintext flag, and never
store a per-user flag at all. Dynamic flags are recomputed on submit.

**`hints`** — optional nudges that cost points.
`id`, `challenge_id`, `order`, `cost_points`, `body_md`.

**`hint_unlocks`** — who paid for what.
`user_id`, `hint_id`, `unlocked_at`. Unique on the pair.

**`instances`** — the live targets. The heart of the system.
`id`, `user_id`, `challenge_id`, `node_id`, `state` (queued, provisioning,
running, failed, destroying, destroyed), `container_id`, `internal_ip`,
`exposed_url`, `exposed_port`, `extensions_used`, `expires_at`, `created_at`,
`destroyed_at`, `failure_reason`. A partial unique index on
`(user_id, challenge_id)` where the state is live prevents double-spawns.

**`submissions`** — every attempt, right or wrong.
`id`, `user_id`, `challenge_id`, `submitted_value`, `correct`, `ip`,
`user_agent`, `created_at`. This table is the anti-cheat evidence trail, so it
records failures too.

**`solves`** — the scoring record.
`user_id`, `challenge_id`, `points_awarded`, `first_blood`, `solved_at`.
Unique on `(user_id, challenge_id)`.

**`nodes`** — the lab host registry.
`id`, `hostname`, `region`, `capacity_slots`, `used_slots`, `state` (draining,
healthy, unreachable), `last_heartbeat_at`.

**`audit_log`** — append-only, for abuse investigations.
`id`, `actor_user_id`, `action`, `target_type`, `target_id`, `metadata` jsonb,
`ip`, `created_at`.

## 3. Development Phases

### Phase 1: Catalog Without Spawning (Week 1-2)

Ship a working jeopardy-style CTF before writing a single line of container
code. This de-risks the whole project, because if the catalog, auth, scoring,
and submission loop are not solid, adding Docker on top only makes debugging
harder.

* Scaffold the Next.js app with TypeScript, Tailwind, and shadcn/ui.
* Set up Neon, wire Drizzle, and write the schema above.
* Integrate Better Auth with email verification gating.
* Build the challenge catalog: grid, filters by category and difficulty, and
  a detail page rendering the description markdown.
* Implement flag submission for static flags, with a strict rate limit and
  full submission logging.
* Build the leaderboard and public profile pages.
* Seed five file-based or purely offline challenges so the platform is
  genuinely playable at the end of this phase.

Done when someone can register, solve a crypto challenge from a downloaded
file, and see their name on the leaderboard.

### Phase 2: The Orchestrator and First Spawn (Week 3-4)

* Stand up the orchestrator service with Fastify, Redis, and BullMQ.
* Authenticate web-to-orchestrator calls with a signed service token, scoped
  and short-lived. The orchestrator trusts the token, never a user-supplied
  user id.
* Implement the lifecycle jobs: `spawn`, `destroy`, `reap`, `reconcile`.
* Provision one lab node by script, with Docker, TLS on the Engine API, and
  Traefik.
* Spawn path: pick a node with capacity, create a per-instance Docker network,
  run the pinned image with limits, attach Traefik labels, poll a health check,
  then mark the instance running.
* Expose HTTP challenges at a random subdomain under a wildcard certificate.
* Build the instance panel in the web UI: spawn button, live state, target URL,
  countdown, extend, and destroy. The frontend surface exists behind
  `LIVE_INSTANCE_UI`; the orchestrator behind it does not.
* Write the reaper and reconciler as BullMQ 6 Job Schedulers that destroy
  expired instances and kill labelled containers with no live database row.

Done when a user clicks spawn, gets a private vulnerable web app at their own
URL within about twenty seconds, and it disappears on schedule.

### Phase 3: Hardening (Week 5)

This phase is not optional and is not a polish pass. Until it is finished the
platform must not be publicly reachable. Every control here is justified in
`SECURITY.md`.

* Enable user namespace remapping on lab nodes, so container root is not host
  root.
* Drop all capabilities by default, set `no-new-privileges`, apply the default
  seccomp profile, and use a read-only root filesystem with explicit tmpfs.
* Give every instance its own network, and add DOCKER-USER firewall rules that
  deny instance traffic to private ranges, the cloud metadata endpoint, and the
  control plane.
* Default-deny egress. Allow only the internal DNS resolver unless a challenge
  declares an explicit allowlist.
* Enforce memory, CPU, and PID limits per instance, a per-user concurrent
  instance cap, and a global node capacity ceiling.
* Add abuse detection on egress volume and connection count, with automatic
  instance kill and an audit log entry.
* Write the terms of service, the acceptable use policy, and an abuse contact.
  Require acceptance at registration.
* Commission an external review or a focused self-review against the threat
  model before opening signups.

### Phase 4: Scoring, Progression, and Anti-Cheat (Week 6)

* Switch to per-user dynamic flags, derived as an HMAC of the user id and
  challenge id. A shared flag is then both useless to the recipient and
  traceable to the leaker.
* Implement decaying scores, so a challenge is worth less as more people solve
  it, with a floor.
* Add first-blood recognition.
* Ship the hint system, with point costs and an explicit confirmation.
* Add flag-sharing detection: flag a solve when the submitted value derives
  from another user's key, and surface it for review rather than auto-banning.
* Build the user dashboard with solve history, category progress, and rank.

### Phase 5: Challenge Pipeline (Week 7)

Content is the product. Making it cheap to add a challenge is what keeps the
platform alive past launch.

* Define the `challenge.yml` manifest format. See
  `docs/challenge-authoring.md`, which already specifies it.
* Build the CI workflow: lint the manifest, build the image, scan it, run the
  automated solve script, and publish by digest to the registry.
* Require every challenge to ship a solve script, so regressions are caught.
* Add a health check contract that the orchestrator uses to decide when an
  instance is actually ready.
* Build the author-facing admin area for drafting and reviewing challenges.

### Phase 6: Beyond HTTP (Week 8+)

* Add WireGuard, so users can reach raw TCP services and full machines rather
  than only web apps. Each user gets a peer, each instance an address in a
  per-user subnet.
* Add an in-browser attacker workstation over Guacamole, which removes the VPN
  setup barrier that loses most beginners.
* Support multi-container challenges, so a scenario can have a web tier, a
  database, and a pivot host on one internal network.
* Evaluate Firecracker microVMs for kernel-level and privilege-escalation
  content that containers cannot host safely.

## Future Scope (Post-MVP)

* Teams, team leaderboards, and private team ranges.
* Seasons with rotating content and archived scoreboards.
* Writeups, unlocked only after a user solves the challenge themselves.
* A guided learning path that sequences challenges into courses.
* Migration from single-node Docker to Kubernetes once one node stops being
  enough, tracked in `docs/adr/0001-docker-over-kubernetes.md`.
* Certificates of completion, and an achievement system.

## Costs and Capacity

At 512 MB per instance, a 16 GB lab node holds roughly 25 concurrent
instances after leaving headroom for the host and Traefik. With a one-hour TTL
and a per-user cap of two, one node comfortably serves a few hundred casual
users. Budget one small VPS for the orchestrator, one for the first lab node,
and Neon plus Vercel on their free or entry tiers. Scale by adding lab nodes,
which the `nodes` table already accounts for.

## Sequencing Note

The phases are ordered so that the riskiest unknown, container orchestration,
lands in Phase 2 with a working product already around it, and hardening lands
in Phase 3 before any public exposure. Resist the temptation to open signups at
the end of Phase 2.
