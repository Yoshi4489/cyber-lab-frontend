import { logoutBackendSession } from "../../../../features/backend/auth-adapter";
import {
  backendBffError,
  bffError,
  bffNoContent,
  isInvalidBackendSession,
} from "../../../../features/backend/bff-response";
import {
  clearBackendSessionCookie,
  readBackendSessionCookie,
} from "../../../../features/backend/bff-session";
import {
  assertSameOriginMutation,
  CsrfValidationError,
} from "../../../../features/backend/csrf";

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOriginMutation(request);
    const cookieSession = await readBackendSessionCookie();
    if (cookieSession) {
      try {
        await logoutBackendSession(cookieSession.sessionToken);
      } catch (error) {
        if (!isInvalidBackendSession(error)) throw error;
      }
    }
    await clearBackendSessionCookie();
    return bffNoContent();
  } catch (error) {
    if (error instanceof CsrfValidationError) return bffError(403, "FORBIDDEN");
    return backendBffError(error);
  }
}
