import "server-only";

export class CsrfValidationError extends Error {
  constructor() {
    super("Browser mutation did not originate from this site.");
    this.name = "CsrfValidationError";
  }
}

/**
 * Requires an explicit same-origin browser request before any BFF mutation.
 * The trusted origin is the request URL provided by Next.js, never a client
 * supplied body field or an untrusted forwarding header.
 */
export function assertSameOriginMutation(request: Request): void {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (!origin || fetchSite === "cross-site" || fetchSite === "same-site") {
    throw new CsrfValidationError();
  }

  try {
    if (new URL(origin).origin !== new URL(request.url).origin) {
      throw new CsrfValidationError();
    }
  } catch (error) {
    if (error instanceof CsrfValidationError) throw error;
    throw new CsrfValidationError();
  }
}
