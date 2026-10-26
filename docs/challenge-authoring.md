# Challenge authoring

Executable targets belong in the independent `../cyber-range-backend`
repository, under `challenges/`. That repository owns reviewed images, runtime
manifests, flag injection, health checks and solve validation. This frontend
owns instructional presentation, not Docker access or runtime configuration.

The frontend's `challenges/web-001-cookie-monster/challenge.yml` is a historical
design sketch. No current build or worker consumes it. Its YAML fields, paid
hints and the former `packages/shared` validator are not implemented contracts.
Use the actual backend schemas described below; do not introduce a second
authoring format or a YAML dependency to implement the sketch.

## Public catalog and private runtime

These are separate contracts:

| Definition | Authoritative backend location | Purpose |
|---|---|---|
| Public catalog | `src/catalog/definitions.ts`, `challengeDefinitionSchema` | Stable ID/slug, title, summary, category, difficulty, points, kind, tags, definition version and publication status |
| Worker runtime | `src/orchestrator/runtime-manifests.ts`, `runtimeManifestSchema` | Pinned image, non-root UID/GID, port, optional command, bounded health check and resource limits |

`npm run db:seed` upserts catalog definitions into PostgreSQL; published rows
are exposed through the existing catalog API. It is an explicit operator
action, not a browser setting. Test only with disposable data during this
milestone. Keep challenge IDs stable when revising content, and unpublish
retired samples rather than deleting their identities or historical solves.

Runtime manifests are trusted worker input. Resolve the built image's actual
digest or image ID before generating the local manifest, and validate the
result through `runtimeManifestSchema`. An image tag alone is rejected. Keep
generated local manifests and all credentials outside version control. A
catalog row alone does not supply a runnable image.

## Harmless Welcome test lab

The user replaced the earlier Cookie Monster proposal with a harmless static
Welcome page. Its seeded stable identity is
`88888888-8888-4888-8888-888888888888`, slug `welcome`, with 10 points once.
It openly displays `FLAG{WELCOME_TO_CISCO_FAMILY}`; no vulnerability, bypass or
attack payload is part of the test. Backend sources are planned under
`challenges/welcome/`, but no implementation exists yet. The replacement
contract diff was approved October 26. Phase 1 now implements validated local
test configuration and opt-in catalog metadata; target runtime and fixed-flag
injection/verification remain later phases. See `PLAN.md` for acceptance evidence.

Use a flag-free health endpoint and relative page navigation; no target cookies
or accounts are needed. The proposed local-only fixed-flag policy is controlled
by trusted backend configuration and applies only to Welcome. Existing owner,
running-state and expiry checks remain mandatory. Public signup remains closed.

## Runtime rules

- Pin the base image by digest and the deployed target by its reviewed image
  digest or ID. Copy only the target's required sources into its image.
- Read the flag from the worker's runtime `CYBER_RANGE_FLAG` environment value.
  Never bake a flag into an image, catalog, example manifest, briefing or test
  snapshot. Other labs retain per-user/challenge/instance dynamic flags. Welcome's
  explicitly documented local test exception injects the shared placeholder at
  runtime, never into an image layer.
- Run non-root with no capabilities, no privileged mode, no devices or mounts,
  no Docker socket, no outbound access and a read-only root. Keep writable space
  limited to the existing bounded tmpfs. Resource exceptions require review.
- Provide a bounded health check that contains no flag and succeeds without
  revealing the intended solution. Readiness gates target URL disclosure.
- Use relative links, asset URLs, form actions and redirects. Ingress strips
  `/labs/<route-key>/` before forwarding, so root-relative navigation escapes the
  assigned target path. Scope cookies to that instance directory, for example
  through the browser's default cookie path; never set a parent-domain cookie.
- Do not use arbitrary forwarded headers to select a cookie domain or redirect
  origin. Handle malformed input safely without reflecting request values into
  the Welcome page.
- Welcome openly displays its harmless placeholder. Future real labs reveal
  their injected flag only after a separately reviewed completion step. Platform
  submissions accept the learner's recovered flag and return an outcome/award,
  never the expected flag. Do not print target response bodies or flag values
  in solve output, errors, logs or acceptance artifacts.

The control plane and lab targets must run on separate hosts. Local
acceptance uses the retained disposable Linux target VM; frontend/API/worker
and data services stay on Windows. Do not run the lab target directly
on the control-plane host. Unit tests may call its request handler with doubles
without starting a listening target there.

## Verification and publication

Ship an automated benign completion check with Welcome. Its CLI reports success
or failure without printing the displayed flag; trusted test code can use an in-memory
result to submit through the real learner contract. Check the displayed
placeholder, flag-free health/error responses and relative navigation. Handler
doubles do not establish real image/ingress safety. No bypass or exploit is used.

Before real target execution, build the reviewed image on the isolated host,
validate the pinned runtime manifest and run worker preflight. Use the platform
to verify readiness, harmless completion, once-only scoring, expiry and cleanup.
Repeat ownership and isolation checks with two independent learners/instances.
The learner frontend and target ingress need different cookie hostnames, not
just different ports; prove the BFF session cookie never reaches the target.

Record exactly which checks ran. Application/fixture tests, a successful image
build and a real end-to-end learner run are separate evidence. CI does not
automatically provide an isolated lab host. Preserve preview isolation, keep
public signup closed and follow each approval checkpoint in `PLAN.md`; this
local milestone does not authorize publishing a challenge to hosted services.
