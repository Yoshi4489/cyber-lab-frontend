import { resolveBackendSession } from "../../../../features/backend/auth-adapter";
import {
  authenticatedBffSession,
  backendBffError,
  isInvalidBackendSession,
  unauthenticatedBffSession,
} from "../../../../features/backend/bff-response";
import {
  clearBackendSessionCookie,
  readBackendSessionCookie,
} from "../../../../features/backend/bff-session";

export async function GET(): Promise<Response> {
  try {
    const cookieSession = await readBackendSessionCookie();
    if (!cookieSession) return unauthenticatedBffSession();

    try {
      return authenticatedBffSession(await resolveBackendSession(cookieSession.sessionToken));
    } catch (error) {
      if (isInvalidBackendSession(error)) {
        await clearBackendSessionCookie();
        return unauthenticatedBffSession();
      }
      return backendBffError(error);
    }
  } catch (error) {
    return backendBffError(error);
  }
}
