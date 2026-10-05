import "server-only";
import { z } from "zod";

export type BackendErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INVALID_REQUEST"
  | "RATE_LIMITED"
  | "NOT_IMPLEMENTED"
  | "INTERNAL_ERROR";


const errorSchema = z
  .object({
    code: z.enum([
      "UNAUTHORIZED",
      "FORBIDDEN",
      "NOT_FOUND",
      "CONFLICT",
      "INVALID_REQUEST",
      "RATE_LIMITED",
      "NOT_IMPLEMENTED",
      "INTERNAL_ERROR",
    ]),
    message: z.string(),
    correlationId: z.uuid(),
  })
  .strict();


export class BackendAdapterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackendAdapterError";
  }
}

export class BackendHttpError extends BackendAdapterError {
  constructor(
    readonly status: number,
    readonly code?: BackendErrorCode,
    readonly correlationId?: string,
  ) {
    super(`Backend request failed with HTTP ${status}.`);
    this.name = "BackendHttpError";
  }
}

export class BackendResponseError extends BackendAdapterError {
  constructor() {
    super("Backend response did not match the API contract.");
    this.name = "BackendResponseError";
  }
}

export class BackendUnavailableError extends BackendAdapterError {
  constructor() {
    super("Backend API is unavailable.");
    this.name = "BackendUnavailableError";
  }
}


export function getBackendBaseUrl(): URL {
  const configured = process.env.BACKEND_URL;
  if (!configured) {
    throw new BackendAdapterError("BACKEND_URL is not configured.");
  }

  let base: URL;
  try {
    base = new URL(configured);
  } catch {
    throw new BackendAdapterError("BACKEND_URL must be an absolute HTTP(S) URL.");
  }

  if (
    !["http:", "https:"].includes(base.protocol) ||
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    !["", "/"].includes(base.pathname)
  ) {
    throw new BackendAdapterError(
      "BACKEND_URL must be a credential-free API origin.",
    );
  }

  const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
  if (
    process.env.NODE_ENV === "production" &&
    base.protocol !== "https:" &&
    !loopbackHosts.has(base.hostname)
  ) {
    throw new BackendAdapterError(
      "Production BACKEND_URL must use HTTPS outside loopback.",
    );
  }

  return base;
}


export type BackendRequestOptions = {
  method?: "GET" | "POST" | "DELETE";
  authorization?: string;
  idempotencyKey?: string;
  body?: object;
};

export async function requestBackendJson<T>(
  path: string, schema: z.ZodType<T>, expectedStatus = 200,
  options: BackendRequestOptions = {},
): Promise<T> {
  const response = await requestBackend(path, options);
  if (!isJson(response)) throw new BackendResponseError();
  if (!response.ok) throw await backendHttpError(response);
  if (response.status !== expectedStatus) throw new BackendResponseError();
  try {
    const parsed = schema.safeParse(await response.json());
    if (!parsed.success) throw new BackendResponseError();
    return parsed.data;
  } catch { throw new BackendResponseError(); }
}

export async function requestBackendNoContent(path: string, options: BackendRequestOptions): Promise<void> {
  const response = await requestBackend(path, options);
  if (!response.ok) throw await backendHttpError(response);
  if (response.status !== 204) throw new BackendResponseError();
}

async function requestBackend(path: string, options: BackendRequestOptions): Promise<Response> {
  const base = getBackendBaseUrl();
  const headers: Record<string, string> = {
    Accept: "application/json", "X-Request-Id": crypto.randomUUID(),
  };
  if (options.authorization) headers.Authorization = `Bearer ${options.authorization}`;
  if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;
  if (options.body) headers["Content-Type"] = "application/json";
  try {
    return await fetch(new URL(path, base), {
      method: options.method ?? "GET", cache: "no-store", headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      redirect: "error", signal: AbortSignal.timeout(5000),
    });
  } catch { throw new BackendUnavailableError(); }
}

async function backendHttpError(response: Response): Promise<BackendHttpError> {
  try {
    const parsed = errorSchema.safeParse(await response.json());
    return new BackendHttpError(response.status,
      parsed.success ? parsed.data.code : undefined,
      parsed.success ? parsed.data.correlationId : undefined);
  } catch { return new BackendHttpError(response.status); }
}

function isJson(response: Response): boolean {
  return response.headers.get("content-type")?.split(";", 1)[0] === "application/json";
}
