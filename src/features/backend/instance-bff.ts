import "server-only";
import { z } from "zod";
import {
  BffUnauthenticatedError,
  BffUnauthorizedScopeError,
} from "./bff-authorization";
import { backendBffError, bffError } from "./bff-response";
import { CsrfValidationError } from "./csrf";

const createInstanceSchema = z.object({ challengeId: z.uuid() }).strict();
const instanceIdSchema = z.uuid();
const idempotencyKeySchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/);

export async function readCreateInstanceInput(
  request: Request,
): Promise<{ challengeId: string } | null> {
  if (request.headers.get("content-type")?.split(";", 1)[0] !== "application/json") {
    return null;
  }

  try {
    const parsed = createInstanceSchema.safeParse(await request.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function hasEmptyBody(request: Request): Promise<boolean> {
  try {
    return (await request.text()).length === 0;
  } catch {
    return false;
  }
}

export function readInstanceId(value: string): string | null {
  const parsed = instanceIdSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function readIdempotencyKey(request: Request): string | null {
  const parsed = idempotencyKeySchema.safeParse(request.headers.get("idempotency-key"));
  return parsed.success ? parsed.data : null;
}

export function instanceBffError(error: unknown): Response {
  if (error instanceof CsrfValidationError || error instanceof BffUnauthorizedScopeError) {
    return bffError(403, "FORBIDDEN");
  }
  if (error instanceof BffUnauthenticatedError) {
    return bffError(401, "UNAUTHORIZED");
  }
  return backendBffError(error);
}
