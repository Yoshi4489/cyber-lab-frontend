import "server-only";
import { z } from "zod";
import { BackendAdapterError, requestBackendJson } from "./transport";
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

async function instanceRequest(path: string, serviceToken: string): Promise<BackendInstance> {
  return requestBackendJson(path, instanceSchema, 200, { authorization: serviceToken });
}
async function mutationRequest(path: string, method: "POST" | "DELETE", serviceToken: string,
  options: { idempotencyKey: string; body?: object }): Promise<BackendInstanceMutation> {
  return requestBackendJson(path, mutationSchema, 202, { ...options, method, authorization: serviceToken });
}
function parseInput<T>(schema: z.ZodType<T>, input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new BackendAdapterError("Backend instance input is invalid.");
  }
  return parsed;
}
