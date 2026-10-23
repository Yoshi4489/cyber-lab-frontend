import { z } from "zod";
import type { operations } from "@/features/backend/generated/openapi";
import type { ApiResult } from "@/features/backend/client";
import { instanceSchema, mutationSchema, isValidIdempotencyKey, type Instance, type InstanceMutation } from "@/features/instances/client";
import { previewCatalog } from "@/features/catalog/preview";
import type { Learner } from "@/features/learner/model";

export const INITIAL_LIFETIME = 60 * 60_000;
export const EXTENSION = 30 * 60_000;
export const ABSOLUTE_LIFETIME = 2 * INITIAL_LIFETIME;
export type PreviewSubmission = operations["submitFlag"]["responses"][200]["content"]["application/json"];
export const previewSubmissionSchema: z.ZodType<PreviewSubmission> = z.object({
  correct: z.boolean(), points: z.number().int().nonnegative(), recorded: z.literal(true), source: z.literal("database"),
}).strict();
export const previewSessionSchema = z.object({
  origin: z.literal("preview"), owner: z.string(), instance: instanceSchema,
  transitionAt: z.number().finite().nonnegative().nullable(),
  completion: previewSubmissionSchema.nullable(),
}).strict();
export type PreviewSessionRecord = z.infer<typeof previewSessionSchema>;
export const previewCommandRecordSchema = z.object({
  fingerprint: z.string(), result: z.union([mutationSchema, previewSubmissionSchema]),
}).strict();

export type PreviewCommand = { operation: "create"; challengeId: string; key: string }
  | { operation: "extend" | "destroy" | "finish"; instanceId: string; key: string };
export type PreviewCommandResult = ApiResult<InstanceMutation | PreviewSubmission>;
export type PreviewIdentity = Pick<Learner, "username" | "signedIn" | "identityEpoch">;

export function isValidPreviewSession(session: PreviewSessionRecord, owner: string | null): boolean {
  const { instance } = session;
  const created = Date.parse(instance.createdAt);
  const expires = Date.parse(instance.expiresAt);
  const transitioning = ["pending", "provisioning", "stopping"].includes(instance.status);
  const ended = ["stopped", "failed", "expired"].includes(instance.status);
  return session.owner === owner && instance.url === undefined
    && previewCatalog.response.challenges.some(challenge => challenge.id === instance.challengeId)
    && Date.parse(instance.absoluteExpiresAt) === created + ABSOLUTE_LIFETIME
    && expires >= created + INITIAL_LIFETIME && expires <= created + ABSOLUTE_LIFETIME
    && (expires - created - INITIAL_LIFETIME) % EXTENSION === 0
    && (transitioning ? session.transitionAt !== null : session.transitionAt === null)
    && (ended ? instance.stoppedAt !== null : instance.stoppedAt === null)
    && (instance.status !== "running" || instance.startedAt !== null)
    && (!["pending", "provisioning"].includes(instance.status) || instance.startedAt === null)
    && (instance.startedAt === null || (Date.parse(instance.startedAt) >= created && Date.parse(instance.startedAt) < expires))
    && (instance.stoppedAt === null || Date.parse(instance.stoppedAt) >= created)
    && (session.completion === null || (instance.status === "stopped" && session.completion.correct));
}

function terminal(state: Learner, session: PreviewSessionRecord, status: "stopped" | "expired", now: number): Learner {
  const instance = instanceSchema.parse({ ...session.instance, status, stoppedAt: new Date(now).toISOString() });
  return syncInstance({ ...state, activeSession: null, lastSession: {
    ...session, transitionAt: null,
    instance,
  } }, instance);
}

function syncInstance(state: Learner, instance: Instance): Learner {
  return { ...state, commands: Object.fromEntries(Object.entries(state.commands).map(([key, command]) => [key,
    "instance" in command.result && command.result.instance.id === instance.id
      ? { ...command, result: { ...command.result, instance } } : command,
  ])) };
}

function updateActive(state: Learner, activeSession: PreviewSessionRecord): Learner {
  return syncInstance({ ...state, activeSession }, activeSession.instance);
}

// Transitions use saved deadlines, so leaving, sleeping, or refreshing never
// grants a fresh lifetime and cannot resurrect an expired simulation.
export function advancePreview(state: Learner, now: number): Learner {
  const session = state.activeSession;
  if (!session) return state;
  if (!state.signedIn || !isValidPreviewSession(session, state.username)) return { ...state, activeSession: null };
  if (session.instance.status === "stopping") {
    return session.transitionAt !== null && now >= session.transitionAt ? terminal(state, session, "stopped", now) : state;
  }
  if (now >= Date.parse(session.instance.expiresAt)) return terminal(state, session, "expired", now);
  const created = Date.parse(session.instance.createdAt);
  if (session.instance.status === "pending" || session.instance.status === "provisioning") {
    if (now >= created + 2000) return updateActive(state, { ...session, transitionAt: null,
      instance: instanceSchema.parse({ ...session.instance, status: "running", startedAt: new Date(created + 2000).toISOString() }),
    });
    if (session.instance.status === "pending" && now >= created + 1000) return updateActive(state, { ...session,
      transitionAt: created + 2000, instance: instanceSchema.parse({ ...session.instance, status: "provisioning" }),
    });
  }
  return state;
}

export function applyPreviewCommand(
  original: Learner, command: PreviewCommand, now: number, uuid: () => string = () => crypto.randomUUID(), actor: PreviewIdentity = original,
): { learner: Learner; result: PreviewCommandResult } {
  let state = original;
  const fail = (code: "UNAUTHORIZED" | "INVALID_REQUEST" | "NOT_FOUND" | "CONFLICT") => ({ learner: state, result: { ok: false as const, code } });
  if (!state.signedIn || !state.username || !actor.signedIn || actor.username !== state.username || actor.identityEpoch !== state.identityEpoch) return fail("UNAUTHORIZED");
  const owner = state.username;
  if (!isValidIdempotencyKey(command.key) || !Number.isFinite(now) || now < 0 || now > 8.64e15 - ABSOLUTE_LIFETIME) return fail("INVALID_REQUEST");
  state = advancePreview(state, now);
  const { key } = command;
  const fingerprint = JSON.stringify(command.operation === "create" ? { challengeId: command.challengeId } : { instanceId: command.instanceId });
  const scopedKey = `${command.operation}:${key}`;
  const prior = state.commands[scopedKey];
  if (prior) {
    if (prior.fingerprint !== fingerprint) return fail("CONFLICT");
    return { learner: state, result: { ok: true, value: "instance" in prior.result
      ? mutationSchema.parse({ ...prior.result, replayed: true }) : prior.result } };
  }
  let result: InstanceMutation | PreviewSubmission;
  if (command.operation === "create") {
    if (!previewCatalog.response.challenges.some(challenge => challenge.id === command.challengeId)) return fail("NOT_FOUND");
    if (state.activeSession) return fail("CONFLICT");
    const instance = instanceSchema.parse({
      id: uuid(), challengeId: command.challengeId, status: "pending", createdAt: new Date(now).toISOString(),
      startedAt: null, expiresAt: new Date(now + INITIAL_LIFETIME).toISOString(),
      absoluteExpiresAt: new Date(now + ABSOLUTE_LIFETIME).toISOString(), stoppedAt: null, failureCode: null,
    });
    state = { ...state, activeSession: { origin: "preview", owner, instance, transitionAt: now + 1000, completion: null }, lastSession: null };
    result = mutationSchema.parse({ instance, operationId: uuid(), replayed: false });
  } else {
    const active = state.activeSession?.instance.id === command.instanceId ? state.activeSession : null;
    const priorInstance = Object.values(state.commands).map(item => item.result).find(item => "instance" in item && item.instance.id === command.instanceId);
    const owned = active?.instance ?? (state.lastSession?.instance.id === command.instanceId ? state.lastSession.instance
      : priorInstance && "instance" in priorInstance ? priorInstance.instance : null);
    if (!owned) return fail("NOT_FOUND");
    if (command.operation === "finish") {
      if (!active || active.instance.status !== "running") return fail("CONFLICT");
      const challenge = previewCatalog.response.challenges.find(item => item.id === active.instance.challengeId)!;
      const points = state.completions[challenge.slug] === undefined ? challenge.points : 0;
      result = previewSubmissionSchema.parse({ correct: true, points, recorded: true, source: "database" });
      state = terminal(state, { ...active, completion: result }, "stopped", now);
      state = { ...state, completions: { ...state.completions, [challenge.slug]: state.completions[challenge.slug] ?? now } };
    } else {
      if (command.operation === "extend") {
        if (!active || active.instance.status !== "running") return fail("CONFLICT");
        const expires = Date.parse(active.instance.expiresAt);
        const cap = Date.parse(active.instance.absoluteExpiresAt);
        if (expires >= cap) return fail("CONFLICT");
        state = updateActive(state, { ...active, instance: instanceSchema.parse({ ...active.instance, expiresAt: new Date(Math.min(cap, expires + EXTENSION)).toISOString() }) });
      } else if (active && active.instance.status !== "stopping") state = updateActive(state, { ...active, transitionAt: now + 1000, instance: instanceSchema.parse({ ...active.instance, status: "stopping" }) });
      result = mutationSchema.parse({ instance: state.activeSession?.instance.id === owned.id ? state.activeSession.instance : owned, operationId: uuid(), replayed: false });
    }
  }
  return { learner: { ...state, commands: { ...state.commands, [scopedKey]: { fingerprint, result } } }, result: { ok: true, value: result } };
}
