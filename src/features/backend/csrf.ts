import "server-only";

export class CsrfValidationError extends Error {
  constructor() {
    super("Browser mutation did not originate from this site.");
    this.name = "CsrfValidationError";
  }
}

export class CsrfConfigurationError extends Error {
  constructor() {
    super("BFF public-origin configuration is invalid.");
    this.name = "CsrfConfigurationError";
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
    const parsedOrigin = new URL(origin);
    if (parsedOrigin.origin !== origin || origin !== expectedBffOrigin(request)) {
      throw new CsrfValidationError();
    }
  } catch (error) {
    if (error instanceof CsrfValidationError || error instanceof CsrfConfigurationError) {
      throw error;
    }
    throw new CsrfValidationError();
  }
}

function expectedBffOrigin(request: Request): string {
  const configured = process.env.BFF_PUBLIC_ORIGIN;
  if (!configured) {
    if (process.env.NODE_ENV === "production") throw new CsrfConfigurationError();
    return new URL(request.url).origin;
  }

  let publicUrl: URL;
  try {
    publicUrl = new URL(configured);
  } catch {
    throw new CsrfConfigurationError();
  }

  if (
    !["http:", "https:"].includes(publicUrl.protocol) ||
    publicUrl.username ||
    publicUrl.password ||
    publicUrl.search ||
    publicUrl.hash ||
    !["", "/"].includes(publicUrl.pathname)
  ) {
    throw new CsrfConfigurationError();
  }

  const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
  if (
    process.env.NODE_ENV === "production" &&
    publicUrl.protocol !== "https:" &&
    !loopbackHosts.has(publicUrl.hostname)
  ) {
    throw new CsrfConfigurationError();
  }

  return publicUrl.origin;
}
