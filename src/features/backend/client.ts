"use client";
import { z } from "zod";

const errorSchema = z.object({
  code: z.enum(["UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "CONFLICT", "INVALID_REQUEST", "RATE_LIMITED", "NOT_IMPLEMENTED", "INTERNAL_ERROR"]),
  message: z.string().optional(),
  correlationId: z.uuid().optional(),
}).strict();
export type ApiErrorCode = z.infer<typeof errorSchema>["code"] | "UNREACHABLE" | "MALFORMED";
export type ApiFailure = { ok: false; code: ApiErrorCode; correlationId?: string; retryAfterMs?: number };
export type ApiResult<T> = { ok: true; value: T } | ApiFailure;

export async function requestBff<T>(path: string, schema: z.ZodType<T>, expectedStatus = 200, init: RequestInit = {}): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(path, { ...init, cache: "no-store", credentials: "same-origin", redirect: "error" });
  } catch { return { ok: false, code: "UNREACHABLE" }; }
  if (!response.ok) {
    let body: unknown;
    try { body = await response.json(); } catch { body = null; }
    const error = errorSchema.safeParse(body);
    const failure: ApiFailure = { ok: false, code: error.success ? error.data.code : "INTERNAL_ERROR" };
    if (error.success && error.data.correlationId) failure.correlationId = error.data.correlationId;
    const seconds = Number(response.headers.get("retry-after"));
    if (response.headers.has("retry-after") && Number.isFinite(seconds) && seconds >= 0) {
      failure.retryAfterMs = Math.max(1000, Math.min(seconds * 1000, 3_600_000));
    }
    return failure;
  }
  if (response.status !== expectedStatus) return { ok: false, code: "MALFORMED" };
  if (expectedStatus === 204) {
    const parsed = schema.safeParse(undefined);
    return parsed.success ? { ok: true, value: parsed.data } : { ok: false, code: "MALFORMED" };
  }
  if (response.headers.get("content-type")?.split(";", 1)[0] !== "application/json") return { ok: false, code: "MALFORMED" };
  try {
    const parsed = schema.safeParse(await response.json());
    return parsed.success ? { ok: true, value: parsed.data } : { ok: false, code: "MALFORMED" };
  } catch { return { ok: false, code: "MALFORMED" }; }
}

export function apiErrorMessage(code: ApiErrorCode): string {
  const messages: Record<ApiErrorCode, string> = {
    UNAUTHORIZED: "Your session is missing or expired. Please sign in.",
    FORBIDDEN: "Your account cannot perform this operation. Check email verification.",
    NOT_FOUND: "The requested item is unavailable or does not belong to your account.",
    CONFLICT: "The request conflicts with the current state. Refresh and try again.",
    INVALID_REQUEST: "Check the values and try again.",
    RATE_LIMITED: "Too many requests. Please wait before retrying.",
    NOT_IMPLEMENTED: "This operation is not available yet.",
    INTERNAL_ERROR: "The server could not complete the request.",
    UNREACHABLE: "The server could not be reached. Check your connection and retry.",
    MALFORMED: "The server returned an unexpected response. Please retry.",
  };
  return messages[code];
}
