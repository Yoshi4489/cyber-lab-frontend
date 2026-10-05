"use client";
import { z } from "zod";
import { requestBff, type ApiErrorCode, type ApiResult } from "../backend/client";

/**
 * Browser-side client for the same-origin instance BFF. It never sends an
 * acting user identifier: the BFF derives identity from the sealed session
 * cookie and mints a scoped service token server-side. Responses are parsed
 * strictly so a malformed upstream payload fails closed instead of rendering.
 */

const instanceStatuses = [
  "pending",
  "provisioning",
  "running",
  "stopping",
  "stopped",
  "failed",
  "expired",
] as const;

const instanceSchema = z
  .object({
    id: z.uuid(),
    challengeId: z.uuid(),
    status: z.enum(instanceStatuses),
    createdAt: z.iso.datetime(),
    startedAt: z.iso.datetime().nullable(),
    expiresAt: z.iso.datetime(),
    absoluteExpiresAt: z.iso.datetime(),
    stoppedAt: z.iso.datetime().nullable(),
    failureCode: z.string().nullable(),
    url: z.url().optional(),
  })
  .strict()
  .superRefine((instance, context) => {
    if (instance.status !== "running" && instance.url !== undefined) {
      context.addIssue({
        code: "custom",
        message: "A target URL is available only for a running instance.",
      });
    }
  });
const mutationSchema = z
  .object({
    instance: instanceSchema,
    operationId: z.uuid(),
    replayed: z.boolean(),
  })
  .strict();
const idempotencyKeyPattern = /^[A-Za-z0-9._:-]{8,128}$/;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type InstanceStatus = (typeof instanceStatuses)[number];
export type Instance = z.infer<typeof instanceSchema>;
export type InstanceMutation = z.infer<typeof mutationSchema>;
export type InstanceOperation = "create" | "extend" | "destroy";
/** `UNREACHABLE` and `MALFORMED` are client-side outcomes, not backend codes. */
export type InstanceErrorCode = ApiErrorCode;
export type InstanceResult<T> = ApiResult<T>;

export function newIdempotencyKey(operation: InstanceOperation): string {
  return `${operation}:${crypto.randomUUID()}`;
}

export function isValidIdempotencyKey(key: string): boolean {
  return idempotencyKeyPattern.test(key);
}

export function isChallengeId(value: string): boolean {
  return uuidPattern.test(value);
}

export async function createInstance(
  challengeId: string,
  idempotencyKey: string,
  signal?: AbortSignal,
): Promise<InstanceResult<InstanceMutation>> {
  return requestBff("/api/instances", mutationSchema, 202, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ challengeId }),
    signal,
  });
}

export async function readInstance(
  instanceId: string,
  signal?: AbortSignal,
): Promise<InstanceResult<Instance>> {
  return requestBff(instancePath(instanceId), instanceSchema, 200, {
    method: "GET",
    signal,
  });
}

export async function extendInstance(
  instanceId: string,
  idempotencyKey: string,
  signal?: AbortSignal,
): Promise<InstanceResult<InstanceMutation>> {
  return requestBff(`${instancePath(instanceId)}/extend`, mutationSchema, 202, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    signal,
  });
}

export async function destroyInstance(
  instanceId: string,
  idempotencyKey: string,
  signal?: AbortSignal,
): Promise<InstanceResult<InstanceMutation>> {
  return requestBff(instancePath(instanceId), mutationSchema, 202, {
    method: "DELETE",
    headers: { "Idempotency-Key": idempotencyKey },
    signal,
  });
}

/** Statuses the backend is still moving through, so the panel keeps polling. */
export function isTransitional(status: InstanceStatus): boolean {
  return status === "pending" || status === "provisioning" || status === "stopping";
}

/** Statuses that still hold capacity, so extend and destroy remain offered. */
export function isActive(status: InstanceStatus): boolean {
  return status === "pending" || status === "provisioning" || status === "running";
}

/**
 * Target URLs are withheld until the backend reports `running`, mirroring the
 * server-side contract so a mid-provision payload cannot surface an address.
 */
export function targetUrlFor(instance: Instance): string | null {
  if (instance.status !== "running" || !instance.url) return null;
  try {
    const url = new URL(instance.url);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? instance.url : null;
  } catch { return null; }
}

export function remainingMs(instance: Instance, now: number): number {
  return Math.max(0, Date.parse(instance.expiresAt) - now);
}

export function formatCountdown(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const pad = (value: number) => value.toString().padStart(2, "0");
  const minutes = pad(Math.floor(seconds / 60) % 60);
  return seconds >= 3600
    ? `${Math.floor(seconds / 3600)}:${minutes}:${pad(seconds % 60)}`
    : `${minutes}:${pad(seconds % 60)}`;
}

export function errorMessage(code: InstanceErrorCode): string {
  switch (code) {
    case "UNAUTHORIZED":
      return "This surface needs a backend session. Please sign in.";
    case "FORBIDDEN":
      return "The session lacks the scope for this operation.";
    case "NOT_FOUND":
      return "That instance no longer exists.";
    case "CONFLICT":
      return "The instance changed while this request was in flight. Reload its state.";
    case "INVALID_REQUEST":
      return "The backend rejected the request as invalid.";
    case "RATE_LIMITED":
      return "Too many lifecycle requests. Wait before retrying.";
    case "NOT_IMPLEMENTED":
      return "The backend has not enabled this operation yet.";
    case "UNREACHABLE":
      return "The request did not reach the server. Check connectivity and retry.";
    case "MALFORMED":
      return "The response did not match the contract and was discarded.";
    default:
      return "The backend could not complete the request.";
  }
}

function instancePath(instanceId: string): string {
  return `/api/instances/${encodeURIComponent(instanceId)}`;
}
