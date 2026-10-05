import "server-only";
import { z } from "zod";
import { BackendAdapterError, requestBackendJson } from "./transport";
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

  const { serviceToken, challengeId, instanceId, flag } = parsed.data;
  return requestBackendJson("/v1/submissions", submissionResultSchema, 200, {
    method: "POST", authorization: serviceToken, body: { challengeId, instanceId, flag },
  });
}
