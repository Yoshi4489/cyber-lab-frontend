import "server-only";
import { z } from "zod";
import {
  BackendAdapterError,
  BackendHttpError,
  BackendResponseError,
  BackendUnavailableError,
  getBackendBaseUrl,
  type BackendErrorCode,
} from "./adapter";
import type { operations } from "./generated/openapi";

const serviceTokenSchema = z
  .string()
  .max(8192)
  .regex(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
const idempotencyKeySchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/);
const createInputSchema = z
  .object({
    serviceToken: serviceTokenSchema,
    challengeId: z.uuid(),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();
const instanceInputSchema = z
  .object({ serviceToken: serviceTokenSchema, instanceId: z.uuid() })
  .strict();
const mutationInputSchema = instanceInputSchema
  .extend({ idempotencyKey: idempotencyKeySchema })
  .strict();
const instanceSchema: z.ZodType<BackendInstance> = z
  .object({
    id: z.uuid(),
    challengeId: z.uuid(),
    status: z.enum([
      "pending",
      "provisioning",
      "running",
      "stopping",
      "stopped",
      "failed",
      "expired",
    ]),
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
const mutationSchema: z.ZodType<BackendInstanceMutation> = z
  .object({
    instance: instanceSchema,
    operationId: z.uuid(),
    replayed: z.boolean(),
  })
  .strict();
const errorSchema = z
  .object({
    code: z.enum([
      "UNAUTHORIZED",
      "FORBIDDEN",
      "NOT_FOUND",
      "CONFLICT",
      "INVALID_REQUEST",
      "RATE_LIMITED",
      "NOT_IMPLEMENTED",
      "INTERNAL_ERROR",
    ]),
    message: z.string(),
    correlationId: z.uuid(),
  })
  .strict();

export type BackendInstance =
  operations["getInstance"]["responses"][200]["content"]["application/json"];
export type BackendInstanceMutation =
  operations["createInstance"]["responses"][202]["content"]["application/json"];

/**
 * Server-only lifecycle calls. Their service token is minted from a resolved
 * backend session; browser input never supplies an acting user identifier.
 */
export async function createBackendInstance(input: {
  serviceToken: string;
  challengeId: string;
  idempotencyKey: string;
}): Promise<BackendInstanceMutation> {
  const parsed = parseInput(createInputSchema, input);
  return mutationRequest("/v1/instances", "POST", parsed.data.serviceToken, {
    idempotencyKey: parsed.data.idempotencyKey,
    body: { challengeId: parsed.data.challengeId },
  });
}

export async function getBackendInstance(input: {
  serviceToken: string;
  instanceId: string;
}): Promise<BackendInstance> {
  const parsed = parseInput(instanceInputSchema, input);
  return instanceRequest(
    `/v1/instances/${encodeURIComponent(parsed.data.instanceId)}`,
    parsed.data.serviceToken,
  );
}

export async function extendBackendInstance(input: {
  serviceToken: string;
  instanceId: string;
  idempotencyKey: string;
}): Promise<BackendInstanceMutation> {
  const parsed = parseInput(mutationInputSchema, input);
  return mutationRequest(
    `/v1/instances/${encodeURIComponent(parsed.data.instanceId)}/extend`,
    "POST",
    parsed.data.serviceToken,
    { idempotencyKey: parsed.data.idempotencyKey },
  );
}

export async function destroyBackendInstance(input: {
  serviceToken: string;
  instanceId: string;
  idempotencyKey: string;
}): Promise<BackendInstanceMutation> {
  const parsed = parseInput(mutationInputSchema, input);
  return mutationRequest(
    `/v1/instances/${encodeURIComponent(parsed.data.instanceId)}`,
    "DELETE",
    parsed.data.serviceToken,
    { idempotencyKey: parsed.data.idempotencyKey },
  );
}

async function instanceRequest(
  path: string,
  serviceToken: string,
): Promise<BackendInstance> {
  const response = await requestBackend(path, "GET", serviceToken);
  if (!response.ok) throw await httpError(response);
  if (response.status !== 200 || !isJson(response)) {
    throw new BackendResponseError();
  }
  return parseResponse(response, instanceSchema);
}

async function mutationRequest(
  path: string,
  method: "POST" | "DELETE",
  serviceToken: string,
  options: { idempotencyKey: string; body?: object },
): Promise<BackendInstanceMutation> {
  const response = await requestBackend(path, method, serviceToken, options);
  if (!response.ok) throw await httpError(response);
  if (response.status !== 202 || !isJson(response)) {
    throw new BackendResponseError();
  }
  return parseResponse(response, mutationSchema);
}

async function requestBackend(
  path: string,
  method: "GET" | "POST" | "DELETE",
  serviceToken: string,
  options?: { idempotencyKey: string; body?: object },
): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${serviceToken}`,
    "X-Request-Id": crypto.randomUUID(),
  };
  if (options) headers["Idempotency-Key"] = options.idempotencyKey;
  if (options?.body) headers["Content-Type"] = "application/json";

  try {
    return await fetch(new URL(path, getBackendBaseUrl()), {
      method,
      cache: "no-store",
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    if (error instanceof BackendAdapterError) throw error;
    throw new BackendUnavailableError();
  }
}

async function parseResponse<T>(
  response: Response,
  schema: z.ZodType<T>,
): Promise<T> {
  try {
    const parsed = schema.safeParse(await response.json());
    if (!parsed.success) throw new BackendResponseError();
    return parsed.data;
  } catch (error) {
    if (error instanceof BackendResponseError) throw error;
    throw new BackendResponseError();
  }
}

async function httpError(response: Response): Promise<BackendHttpError> {
  if (!isJson(response)) return new BackendHttpError(response.status);

  try {
    const parsed = errorSchema.safeParse(await response.json());
    return new BackendHttpError(
      response.status,
      parsed.success ? (parsed.data.code as BackendErrorCode) : undefined,
      parsed.success ? parsed.data.correlationId : undefined,
    );
  } catch {
    return new BackendHttpError(response.status);
  }
}

function parseInput<T>(schema: z.ZodType<T>, input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new BackendAdapterError("Backend instance input is invalid.");
  }
  return parsed;
}

function isJson(response: Response): boolean {
  return response.headers.get("content-type")?.split(";", 1)[0] === "application/json";
}
