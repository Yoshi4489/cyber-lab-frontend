import { describe, expect, it } from "vitest";
import { emptyLearner, readLearner, totalXp, type Learner } from "../../src/features/learner/model";
import { previewCatalog } from "../../src/features/catalog/preview";
import { instanceSchema, mutationSchema } from "../../src/features/instances/client";
import { ABSOLUTE_LIFETIME, advancePreview, applyPreviewCommand, EXTENSION, INITIAL_LIFETIME, previewSubmissionSchema, type PreviewCommand, type PreviewCommandResult } from "../../src/features/session/preview-model";

const now = Date.parse("2026-10-23T10:00:00.000Z");
const challenge = previewCatalog.response.challenges[0]!;
const second = previewCatalog.response.challenges[1]!;
const signedIn = (): Learner => ({ ...emptyLearner, username: "curious_owl", signedIn: true });
function create(state = signedIn(), key = "create:session:0001", time = now) {
  return applyPreviewCommand(state, { operation: "create", challengeId: challenge.id, key }, time);
}
function change(state: Learner, operation: "extend" | "destroy" | "finish", time = now + 3000, key = `${operation}:session:0001`) {
  return applyPreviewCommand(state, { operation, instanceId: state.activeSession?.instance.id ?? state.lastSession!.instance.id, key }, time);
}
function mutation(result: PreviewCommandResult) {
  if (!result.ok || !("instance" in result.value)) throw new Error("Expected mutation");
  return result.value;
}
function submission(result: PreviewCommandResult) {
  if (!result.ok || "instance" in result.value) throw new Error("Expected submission");
  return result.value;
}

describe("contract-shaped preview lifecycle", () => {
  it("creates one pending owned instance with contract timing and no URL", () => {
    const result = create();
    const dto = mutation(result.result);
    expect(mutationSchema.parse(dto)).toEqual(dto);
    expect(dto.instance.status).toBe("pending");
    expect(dto.instance.url).toBeUndefined();
    expect(Date.parse(dto.instance.expiresAt) - now).toBe(INITIAL_LIFETIME);
    expect(Date.parse(dto.instance.absoluteExpiresAt) - now).toBe(ABSOLUTE_LIFETIME);
    expect(result.learner.activeSession?.owner).toBe("curious_owl");
    expect(result.learner.activeSession?.origin).toBe("preview");
    expect(dto).not.toHaveProperty("owner");
  });

  it("transitions using original deadlines after a pause or reload", () => {
    const pending = create().learner;
    const provisioning = advancePreview(pending, now + 1000);
    expect(provisioning.activeSession?.instance.status).toBe("provisioning");
    const running = advancePreview(readLearner(JSON.stringify(provisioning)), now + 20_000);
    expect(running.activeSession?.instance.status).toBe("running");
    expect(running.activeSession?.instance.startedAt).toBe(new Date(now + 2000).toISOString());
    expect(running.activeSession?.instance.expiresAt).toBe(pending.activeSession?.instance.expiresAt);
  });

  it("rejects a second active instance, including another sample lab", () => {
    const pending = create().learner;
    expect(create(pending, "create:other:0001").result).toEqual({ ok: false, code: "CONFLICT" });
    expect(applyPreviewCommand(pending, { operation: "create", challengeId: second.id, key: "create:other:0002" }, now).result).toEqual({ ok: false, code: "CONFLICT" });
  });

  it("replays current instance state and original operation ID rather than stale pending data", () => {
    const first = create();
    const replay = create(first.learner, "create:session:0001", now + 3000);
    expect(mutation(replay.result).instance.status).toBe("running");
    expect(mutation(replay.result).operationId).toBe(mutation(first.result).operationId);
    expect(mutation(replay.result).replayed).toBe(true);
    expect(mutation(replay.result).instance.id).toBe(mutation(first.result).instance.id);
    const reordered: PreviewCommand = { key: "create:session:0001", challengeId: challenge.id, operation: "create" };
    expect(applyPreviewCommand(replay.learner, reordered, now + 3000).result.ok).toBe(true);
    expect(applyPreviewCommand(replay.learner, { ...reordered, challengeId: second.id }, now + 3000).result).toEqual({ ok: false, code: "CONFLICT" });
  });

  it("scopes idempotency keys by operation and does not extend twice on replay", () => {
    const first = create(signedIn(), "same-key:0001");
    const extended = change(first.learner, "extend", now + 3000, "same-key:0001");
    expect(mutation(extended.result).replayed).toBe(false);
    const twice = change(extended.learner, "extend", now + 4000, "same-key:0001");
    expect(mutation(twice.result).instance.expiresAt).toBe(new Date(now + INITIAL_LIFETIME + EXTENSION).toISOString());
    expect(mutation(twice.result).replayed).toBe(true);
  });

  it("extends only a running instance and respects the two-hour cap", () => {
    const pending = create().learner;
    expect(change(pending, "extend", now + 500).result).toEqual({ ok: false, code: "CONFLICT" });
    expect(change(pending, "extend", now + 1500).result).toEqual({ ok: false, code: "CONFLICT" });
    const first = change(pending, "extend");
    const capped = change(first.learner, "extend", now + 4000, "extend:session:0002");
    expect(mutation(capped.result).instance.expiresAt).toBe(new Date(now + ABSOLUTE_LIFETIME).toISOString());
    expect(change(capped.learner, "extend", now + 5000, "extend:session:0003").result).toEqual({ ok: false, code: "CONFLICT" });
  });

  it("stops pending or running instances and accepts repeated stop in stopping/terminal states", () => {
    const pending = create().learner;
    const stopped = change(pending, "destroy", now + 500);
    expect(mutation(stopped.result).instance.status).toBe("stopping");
    const repeated = change(stopped.learner, "destroy", now + 600, "destroy:session:0002");
    expect(mutation(repeated.result).instance.status).toBe("stopping");
    const terminal = advancePreview(repeated.learner, now + 2000);
    expect(terminal.activeSession).toBeNull();
    expect(terminal.lastSession?.instance.status).toBe("stopped");
    const again = change(terminal, "destroy", now + 3000, "destroy:session:0003");
    expect(mutation(again.result).instance.status).toBe("stopped");
    expect(again.learner.activeSession).toBeNull();
  });

  it("expires on the saved absolute expiry and cannot extend or finish it", () => {
    const pending = create().learner;
    const expired = advancePreview(pending, now + INITIAL_LIFETIME);
    expect(expired.activeSession).toBeNull();
    expect(expired.lastSession?.instance.status).toBe("expired");
    expect(change(expired, "finish", now + INITIAL_LIFETIME).result).toEqual({ ok: false, code: "CONFLICT" });
    expect(change(expired, "extend", now + INITIAL_LIFETIME).result).toEqual({ ok: false, code: "CONFLICT" });
    expect(totalXp(expired)).toBe(0);
    expect(create(expired, "create:session:0002", now + INITIAL_LIFETIME).result.ok).toBe(true);
  });

  it("finishes once, preserves completion time on duplicate/replay and awards zero extra XP", () => {
    const first = create();
    expect(change(first.learner, "finish", now + 1000).result).toEqual({ ok: false, code: "CONFLICT" });
    const finished = change(first.learner, "finish");
    expect(previewSubmissionSchema.parse(submission(finished.result))).toEqual({ correct: true, points: challenge.points, recorded: true, source: "database" });
    expect(finished.learner.activeSession).toBeNull();
    expect(finished.learner.lastSession?.instance.status).toBe("stopped");
    const duplicate = change(finished.learner, "finish", now + 4000);
    expect(duplicate.result).toEqual(finished.result);
    expect(totalXp(duplicate.learner)).toBe(challenge.points);
    const replay = create(duplicate.learner, "create:session:0002", now + 5000);
    const finishedReplay = change(replay.learner, "finish", now + 8000, "finish:session:0002");
    expect(submission(finishedReplay.result).points).toBe(0);
    expect(finishedReplay.learner.completions[challenge.slug]).toBe(now + 3000);
    expect(totalXp(finishedReplay.learner)).toBe(challenge.points);
  });

  it("keeps historical mutation retries current after a later demo starts", () => {
    const first = create();
    const finished = change(first.learner, "finish");
    const next = create(finished.learner, "create:session:0002", now + 5000);
    const replay = create(next.learner, "create:session:0001", now + 5000);
    expect(mutation(replay.result).instance.status).toBe("stopped");
    expect(replay.learner.activeSession?.instance.id).toBe(next.learner.activeSession?.instance.id);
  });

  it("rejects missing identity, unknown/foreign instance IDs, invalid keys, and invalid clocks", () => {
    expect(create(emptyLearner).result).toEqual({ ok: false, code: "UNAUTHORIZED" });
    expect(create(signedIn(), "short").result).toEqual({ ok: false, code: "INVALID_REQUEST" });
    for (const invalid of [NaN, Infinity, -1, 8.64e15]) expect(create(signedIn(), "create:clock:0001", invalid).result).toEqual({ ok: false, code: "INVALID_REQUEST" });
    const state = create().learner;
    for (const operation of ["extend", "destroy", "finish"] as const) expect(applyPreviewCommand(state, { operation, instanceId: crypto.randomUUID(), key: "foreign:session:0001" }, now + 3000).result).toEqual({ ok: false, code: "NOT_FOUND" });
  });

  it.each(["signed-out", "different-name", "same-name-new-sign-in"])("rejects queued work after identity transition %s", change => {
    const epoch = crypto.randomUUID();
    const actor = { ...signedIn(), identityEpoch: epoch };
    const current = change === "signed-out" ? { ...actor, signedIn: false, identityEpoch: null }
      : change === "different-name" ? { ...actor, username: "different_owl", identityEpoch: crypto.randomUUID() }
      : { ...actor, identityEpoch: crypto.randomUUID() };
    const result = applyPreviewCommand(current, { operation: "create", challengeId: challenge.id, key: "create:queued:0001" }, now, undefined, actor);
    expect(result.result).toEqual({ ok: false, code: "UNAUTHORIZED" });
    expect(result.learner).toEqual(current);
    expect(result.learner.activeSession).toBeNull();
  });
});

describe("local learner migration and validation", () => {
  it("preserves valid legacy identity/completions and discards all legacy active simulations", () => {
    const migrated = readLearner(JSON.stringify({ version: 1, username: "legacy_owl", signedIn: true,
      completions: { [challenge.slug]: now, "unknown-lab": now, [second.slug]: "bad" },
      sessions: { [challenge.slug]: { startedAt: now, expiresAt: now + 99_999_999 } },
    }));
    expect(migrated.version).toBe(2);
    expect(migrated.username).toBe("legacy_owl");
    expect(migrated.signedIn).toBe(true);
    expect(migrated.completions).toEqual({ [challenge.slug]: now });
    expect(migrated.activeSession).toBeNull();
    expect(migrated.commands).toEqual({});
  });

  it("round-trips running sessions and rejects foreign owners, target links, and corrupt lifetimes", () => {
    const state = advancePreview(create().learner, now + 3000);
    expect(readLearner(JSON.stringify(state))).toEqual(state);
    for (const instance of [
      { ...state.activeSession!.instance, url: "https://target.example.test" },
      { ...state.activeSession!.instance, expiresAt: new Date(now + 10_000).toISOString() },
      { ...state.activeSession!.instance, absoluteExpiresAt: new Date(now + 999_999_999).toISOString() },
      { ...state.activeSession!.instance, startedAt: null },
    ]) {
      expect(instanceSchema.safeParse(instance).success).toBe(true);
      expect(readLearner(JSON.stringify({ ...state, activeSession: { ...state.activeSession, instance } })).activeSession).toBeNull();
    }
    expect(readLearner(JSON.stringify({ ...state, username: "different_owl" })).activeSession).toBeNull();
    expect(readLearner(JSON.stringify({ ...state, signedIn: false })).activeSession).toBeNull();
  });

  it("treats malformed/unknown storage as empty rather than trusting it", () => {
    for (const raw of [null, "bad", '{"version":99}', JSON.stringify({ version: 1, username: "bad name", signedIn: true, completions: {} })]) expect(readLearner(raw)).toEqual(emptyLearner);
  });
});
