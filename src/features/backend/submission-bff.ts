import "server-only";
import { z } from "zod";
import {
  BffUnauthenticatedError,
  BffUnauthorizedScopeError,
} from "./bff-authorization";
import { backendBffError, bffError } from "./bff-response";
import { CsrfValidationError } from "./csrf";

const submissionSchema = z
  .object({
    challengeId: z.uuid(),
    instanceId: z.uuid(),
    flag: z.string().min(1).max(256),
  })
  .strict();

export async function readSubmissionInput(
  request: Request,
): Promise<{ challengeId: string; instanceId: string; flag: string } | null> {
  if (request.headers.get("content-type")?.split(";", 1)[0] !== "application/json") {
    return null;
  }

  try {
    const parsed = submissionSchema.safeParse(await request.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function submissionBffError(error: unknown): Response {
  if (error instanceof CsrfValidationError || error instanceof BffUnauthorizedScopeError) {
    return bffError(403, "FORBIDDEN");
  }
  if (error instanceof BffUnauthenticatedError) {
    return bffError(401, "UNAUTHORIZED");
  }
  return backendBffError(error);
}
