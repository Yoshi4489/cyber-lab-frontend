import "server-only";
import { backendBffError, bffError, isInvalidBackendSession } from "./bff-response";
import { resolveBackendSession } from "./auth-adapter";
import {
  clearBackendSessionCookie,
  readBackendSessionCookie,
} from "./bff-session";
import {
  issueBackendServiceToken,
  type BackendServiceScope,
} from "./service-token";

export class BffUnauthenticatedError extends Error {
  constructor() {
    super("A trusted backend session is required.");
    this.name = "BffUnauthenticatedError";
  }
}

export class BffUnauthorizedScopeError extends Error {
  constructor() {
    super("The trusted backend session does not allow this operation.");
    this.name = "BffUnauthorizedScopeError";
  }
}

/**
 * Resolves the sealed session on the server and mints one short-lived token
 * for the required backend scope. Browser requests never select the actor.
 */
export async function issueBffServiceToken(
  scope: BackendServiceScope,
  requireVerifiedEmail = false,
): Promise<string> {
  const cookieSession = await readBackendSessionCookie();
  if (!cookieSession) throw new BffUnauthenticatedError();

  let session;
  try {
    session = await resolveBackendSession(cookieSession.sessionToken);
  } catch (error) {
    if (isInvalidBackendSession(error)) {
      await clearBackendSessionCookie();
      throw new BffUnauthenticatedError();
    }
    throw error;
  }

  if ((requireVerifiedEmail && !session.user.emailVerified) || !session.allowedScopes.includes(scope)) {
    throw new BffUnauthorizedScopeError();
  }
  return issueBackendServiceToken(session, scope);
}

/** Maps a scoped read's authorization failures to the BFF `{ code }` envelope. */
export function authorizedReadBffError(error: unknown): Response {
  if (error instanceof BffUnauthorizedScopeError) return bffError(403, "FORBIDDEN");
  if (error instanceof BffUnauthenticatedError) return bffError(401, "UNAUTHORIZED");
  return backendBffError(error);
}
