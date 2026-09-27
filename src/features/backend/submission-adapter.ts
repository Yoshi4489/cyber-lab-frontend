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

const submissionInputSchema = z
  .object({
    serviceToken: z
      .string()
      .max(8192)
      .regex(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/),
    challengeId: z.uuid(),
    instanceId: z.uuid(),
    flag: z.string().min(1).max(256),
  })
  .strict();
const submissionResultSchema: z.ZodType<BackendFlagSubmission> = z
  .object({
    correct: z.boolean(),
    points: z.number().int().nonnegative(),
    recorded: z.literal(true),
    source: z.literal("database"),
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

export type BackendFlagSubmission =
  operations["submitFlag"]["responses"][200]["content"]["application/json"];

/**
 * Sends a flag only to the backend from server-side BFF code. The actor is
 * derived from the short-lived service token; flag values are never logged or
 * included in errors or response projections here.
 */
export async function submitBackendFlag(input: {
  serviceToken: string;
  challengeId: string;
  instanceId: string;
  flag: string;
}): Promise<BackendFlagSubmission> {
  const parsed = submissionInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new BackendAdapterError("Backend flag-submission input is invalid.");
  }

  const response = await requestBackend(parsed.data);
  if (!response.ok) throw await httpError(response);
  if (response.status !== 200 || !isJson(response)) {
    throw new BackendResponseError();
  }

  try {
    const result = submissionResultSchema.safeParse(await response.json());
    if (!result.success) throw new BackendResponseError();
    return result.data;
  } catch (error) {
    if (error instanceof BackendResponseError) throw error;
    throw new BackendResponseError();
  }
}

async function requestBackend(input: {
  serviceToken: string;
  challengeId: string;
  instanceId: string;
  flag: string;
}): Promise<Response> {
  try {
    return await fetch(new URL("/v1/submissions", getBackendBaseUrl()), {
      method: "POST",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${input.serviceToken}`,
        "Content-Type": "application/json",
        "X-Request-Id": crypto.randomUUID(),
      },
      body: JSON.stringify({
        challengeId: input.challengeId,
        instanceId: input.instanceId,
        flag: input.flag,
      }),
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    if (error instanceof BackendAdapterError) throw error;
    throw new BackendUnavailableError();
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

function isJson(response: Response): boolean {
  return response.headers.get("content-type")?.split(";", 1)[0] === "application/json";
}
