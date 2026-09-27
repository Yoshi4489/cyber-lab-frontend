import { z } from "zod";
import { loginBackend, logoutBackendSession } from "../../../../features/backend/auth-adapter";
import {
  authenticatedBffSession,
  backendBffError,
  bffError,
} from "../../../../features/backend/bff-response";
import { setBackendSessionCookie } from "../../../../features/backend/bff-session";
import {
  assertSameOriginMutation,
  CsrfValidationError,
} from "../../../../features/backend/csrf";

const loginInputSchema = z
  .object({
    email: z.email().max(320),
    password: z.string().min(12).max(1024),
  })
  .strict();

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOriginMutation(request);
    const input = await loginInput(request);
    if (!input) return bffError(400, "INVALID_REQUEST");

    const session = await loginBackend(input);
    try {
      await setBackendSessionCookie({
        sessionToken: session.sessionToken,
        absoluteExpiresAt: session.absoluteExpiresAt,
      });
    } catch (error) {
      await logoutBackendSession(session.sessionToken).catch(() => undefined);
      throw error;
    }

    return authenticatedBffSession(session);
  } catch (error) {
    if (error instanceof CsrfValidationError) return bffError(403, "FORBIDDEN");
    return backendBffError(error);
  }
}

async function loginInput(request: Request) {
  if (request.headers.get("content-type")?.split(";", 1)[0] !== "application/json") {
    return null;
  }

  try {
    const parsed = loginInputSchema.safeParse(await request.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
