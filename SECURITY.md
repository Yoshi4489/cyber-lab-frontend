# Security Model

This platform hands strangers a machine and invites them to break it. The
targets are supposed to fall. The question this document answers is what
happens next, and the goal is that the answer is always "nothing interesting."

Read this before Phase 2 and implement it during Phase 3. The platform must not
accept public signups until every control marked **required** is in place.

The approved local Welcome milestone uses harmless placeholder content. Its
target page intentionally displays a public runtime-injected value; it contains
no vulnerability or exploit. This narrow development/test exception is specified
in the sibling backend's `docs/API.md`; it does not change the production flag
model or authorize returning expected flags from control-plane APIs. All public
launch requirements below remain open until supported by production evidence.

## Threats, in rough order of how much they should worry you

### 1. Container escape

A user gets root in the target, which most challenges intend, and then breaks
out to the host.

**Required controls.**

* Enable user namespace remapping on every lab node. Root inside the container
  maps to an unprivileged host uid, so an escape lands as nobody.
* Drop all capabilities, then add back only what the challenge declares.
* Set `no-new-privileges`, so a setuid binary inside cannot elevate.
* Keep the default seccomp and AppArmor profiles. Never run `--privileged`, and
  never mount the Docker socket into a target. There is no challenge design
  that justifies either.
* Read-only root filesystem with explicit tmpfs mounts for the paths that
  genuinely need writes.
* Treat lab nodes as disposable. They hold no secrets, no database credentials,
  and nothing that is not rebuildable from the bootstrap script.

For kernel-level and privilege-escalation content, containers share the host
kernel and the isolation argument gets much weaker. That content belongs on
Firecracker microVMs in Phase 6, not on a shared-kernel container today.

### 2. Lateral movement

A user attacks another user's instance, or reaches the control plane.

**Required controls.**

* One Docker network per instance. Not one per challenge, one per instance.
* Disable inter-container communication on the default bridge.
* Firewall rules in the DOCKER-USER chain that deny instance traffic to all
  private ranges, to the cloud metadata endpoint at 169.254.169.254, and to the
  orchestrator.
* Lab nodes never hold credentials for the database or the control plane. The
  control plane dials out to them, which means there is nothing on the node to
  steal and reuse.
* Unguessable instance subdomains, so instances cannot be enumerated from
  outside.

The metadata endpoint deserves its own line. On most cloud providers it hands
out instance credentials to anything that asks, from inside, with no
authentication. It is the single most reliable pivot from container to cloud
account, and blocking it is not optional.

### 3. Using the range as a launchpad

Someone spawns an instance and attacks the internet from it, or mines
cryptocurrency, or joins a botnet. This is the threat most likely to actually
happen, because it needs no skill, and the consequence is your provider
terminating your account.

**Required controls.**

* Default-deny egress. Allow the internal DNS resolver and nothing else, unless
  a challenge manifest declares a specific allowlist and a human approved it.
* Rate-limit outbound connection attempts and alert on volume.
* Kill instances automatically on egress anomalies and write an audit entry.
* Short TTL, capped extensions, and per-user concurrency limits, which bound
  the damage window even when detection misses.
* Publish an abuse contact and respond to reports.

Default-deny is the control that matters. Everything else is a backstop for the
challenges that need a hole punched in it.

### 4. Resource exhaustion

A fork bomb, a memory balloon, a disk filler, or just too many users at once.

**Required controls.**

* Per-container memory, CPU, and PID limits. The PID limit is what stops a fork
  bomb, and it is the one people forget.
* Storage quotas, and read-only root filesystems where the challenge allows.
* Per-user concurrent instance caps, two by default.
* Per-node capacity ceilings tracked in the `nodes` table, with new spawns
  queued or refused rather than oversubscribed.
* Reaper and reconciler, so failure modes cannot leak containers indefinitely.

### 5. Platform application attacks

Users who are good at attacking web apps will attack yours. Expect it, and
expect it early.

**Required controls.**

* Authorization checks on every instance operation, keyed on the session user.
  An instance id in a URL must never be sufficient to control that instance.
* The orchestrator reads the user id from the signed service token only, never
  from a request body.
* Rate limits on flag submission, on spawn, and on auth endpoints.
* Never render challenge-supplied or user-supplied markdown as raw HTML.
* No secrets in client bundles, and no flag values ever sent to a client.
* Treat the instance URL as a capability. Do not leak other users' URLs through
  any API response.

Run `/security-review` against the diff before each release, and assume your
users read the client bundle.

### 6. Cheating

Flag sharing, solve-script trading, and scoreboard manipulation.

**Controls.**

* Per-user dynamic flags, so a shared flag does not work and identifies its
  source. See the flag model in `ARCHITECTURE.md`.
* Log every submission, including failures, with ip and user agent.
* Flag suspicious solves for human review rather than auto-banning. False
  positives on an anti-cheat system cost more trust than the cheating does.
* Gate writeups behind solving the challenge.

### 7. Legal and ethical exposure

A training platform that teaches offensive technique needs its boundaries
written down, not assumed.

**Required before launch.**

* Terms of service and an acceptable use policy, accepted at registration, that
  state plainly: attack only the targets the platform assigns you, attacking
  the platform infrastructure itself is out of scope, and attacking third
  parties from the range will get you banned and reported.
* An in-scope statement per challenge, so there is no ambiguity about what a
  user is allowed to touch.
* A documented abuse contact and a takedown process.
* A vulnerability disclosure policy for the platform itself, since some of your
  users will find real bugs in it and you want those reported rather than sold.
* Retention policy for submission logs and ip addresses, with a stated period.
* Age gate and jurisdiction review, because some material is regulated in some
  places.

## Controls checklist

Copy this into the Phase 3 tracking issue.

**Lab node hardening**
- [ ] userns-remap enabled
- [ ] `--cap-drop ALL` default, explicit adds only
- [ ] `no-new-privileges` set
- [ ] default seccomp and AppArmor retained
- [ ] read-only rootfs with explicit tmpfs
- [ ] no privileged containers, no socket mounts, enforced in code not convention
- [ ] node rebuildable from script, holds no secrets

**Network**
- [ ] per-instance network
- [ ] icc disabled on default bridge
- [ ] DOCKER-USER deny to RFC1918
- [ ] DOCKER-USER deny to 169.254.169.254
- [ ] DOCKER-USER deny to control plane
- [ ] default-deny egress with DNS-only allow
- [ ] egress volume monitoring with auto-kill

**Resources**
- [ ] memory, CPU, PID limits per instance
- [ ] storage quota
- [ ] per-user concurrency cap
- [ ] per-node capacity ceiling
- [ ] reaper running
- [ ] reconciler running

**Application**
- [ ] authorization on every instance operation
- [ ] user id from signed token only
- [ ] rate limits on submit, spawn, and auth
- [ ] markdown sanitized
- [ ] no flags reachable from any client response

**Policy**
- [ ] terms of service and acceptable use policy live
- [ ] per-challenge scope statement
- [ ] abuse contact published
- [ ] vulnerability disclosure policy published
- [ ] log retention policy stated

## Standing rules

1. The control plane and the targets never share a host.
2. Targets are hostile by default. Every capability one holds is one you
   deliberately granted.
3. A lab node is cattle. If one behaves strangely, destroy and rebuild it
   rather than investigating in place.
4. Any control listed as required blocks public launch. None of them are
   polish.
