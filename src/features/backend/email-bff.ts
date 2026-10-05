import "server-only";
import { z } from "zod";
import { authEmailOperation } from "./auth-adapter";
import { assertSameOriginMutation, CsrfValidationError } from "./csrf";
import { backendBffError, bffError, bffJson, bffNoContent } from "./bff-response";

export type EmailOperation = "verification/request" | "verification/confirm" | "password-reset/request" | "password-reset/confirm";
export function emailRoute(operation: EmailOperation) {
  return async (request: Request): Promise<Response> => {
    try {
      assertSameOriginMutation(request);
      if (request.headers.get("content-type")?.split(";", 1)[0] !== "application/json") return bffError(400, "INVALID_REQUEST");
      const schema = operation.endsWith("/request") ? z.object({ email: z.email().max(320) }).strict()
        : operation === "password-reset/confirm" ? z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/), newPassword: z.string().min(12).max(1024) }).strict()
        : z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).strict();
      let body: unknown;
      try { body = await request.json(); } catch { return bffError(400, "INVALID_REQUEST"); }
      const parsed = schema.safeParse(body);
      if (!parsed.success) return bffError(400, "INVALID_REQUEST");
      const result = await authEmailOperation(operation, parsed.data);
      return operation.endsWith("/request") ? bffJson(result, 202) : bffNoContent();
    } catch (error) {
      return error instanceof CsrfValidationError ? bffError(403, "FORBIDDEN") : backendBffError(error);
    }
  };
}
