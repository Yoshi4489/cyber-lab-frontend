import "server-only";
import {
  BackendHttpError,
  type BackendErrorCode,
} from "./adapter";
import type { BackendResolvedSession } from "./auth-adapter";

const noStoreHeaders = { "Cache-Control": "no-store" };

export function bffJson(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: noStoreHeaders });
}

export function bffNoContent(): Response {
  return new Response(null, { status: 204, headers: noStoreHeaders });
}

export function bffError(status: number, code: BackendErrorCode): Response {
  return bffJson({ code }, status);
}

export function backendBffError(error: unknown): Response {
  if (error instanceof BackendHttpError) {
    return bffError(
      error.status >= 400 && error.status <= 599 ? error.status : 502,
      error.code ?? "INTERNAL_ERROR",
    );
  }
  return bffError(503, "INTERNAL_ERROR");
}

export function authenticatedBffSession(
  session: Pick<BackendResolvedSession, "user">,
): Response {
  return bffJson({
    authenticated: true,
    user: {
      displayName: session.user.displayName,
      emailVerified: session.user.emailVerified,
    },
  });
}

export function unauthenticatedBffSession(): Response {
  return bffJson({ authenticated: false });
}

export function isInvalidBackendSession(error: unknown): boolean {
  return (
    error instanceof BackendHttpError &&
    (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN")
  );
}
