# Development Plan: CiscoKU Lab

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

The server transport consolidation is implemented. Existing feature wrappers
retain their interfaces and response validation. Live acceptance still needs a
running API, a disposable player, and a prepared isolated worker/ingress with a
reviewed runtime manifest. The default API origin is `http://127.0.0.1:4000`.

## CiscoKU Lab: approved UX implementation (September 2026)

This section takes precedence for the current frontend work. The platform
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
