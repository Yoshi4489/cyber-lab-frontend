import "server-only";
import { z } from "zod";
import { BackendAdapterError, requestBackendJson, requestBackendNoContent } from "./transport";
import type { operations } from "./generated/openapi";

const bffConfigSchema = z.object({
  BFF_AUTH_SECRET: z.string().min(32),
});
const sessionTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const loginInputSchema = z
  .object({
    email: z.email().max(320),
    password: z.string().min(12).max(1024),
  })
  .strict();
const userSchema = z
  .object({
    id: z.uuid(),
    email: z.email(),
    displayName: z.string(),
    role: z.enum(["player", "admin"]),
    emailVerified: z.boolean(),
  })
  .strict();
const resolvedSessionSchema = z
  .object({
    sessionId: z.uuid(),
    user: userSchema,
    allowedScopes: z.array(z.string()),
    idleExpiresAt: z.iso.datetime(),
    absoluteExpiresAt: z.iso.datetime(),
  })
  .strict();
const loginSchema: z.ZodType<BackendLogin> = resolvedSessionSchema
  .extend({ sessionToken: sessionTokenSchema })
  .strict();
export type BackendLoginInput =
  operations["login"]["requestBody"]["content"]["application/json"];
export type BackendLogin =
  operations["login"]["responses"][200]["content"]["application/json"];
export type BackendResolvedSession =
  operations["resolveSession"]["responses"][200]["content"]["application/json"];

/**
 * Calls are for a future BFF route only. Login credentials and opaque backend
 * session tokens never become browser-visible state through this adapter.
 */
export async function loginBackend(input: BackendLoginInput): Promise<BackendLogin> {
  const parsed = loginInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new BackendAdapterError("Backend login input is invalid.");
  }
  return postForJson("/v1/auth/login", parsed.data, loginSchema);
}

export async function resolveBackendSession(
  sessionToken: string,
): Promise<BackendResolvedSession> {
  return postForJson(
    "/v1/auth/session",
    { sessionToken: validSessionToken(sessionToken) },
    resolvedSessionSchema,
  );
}

export async function logoutBackendSession(sessionToken: string): Promise<void> {
  return requestBackendNoContent("/v1/auth/logout", { method: "POST",
    authorization: bffAuthSecretFromEnvironment(), body: { sessionToken: validSessionToken(sessionToken) } });
}
async function postForJson<T>(path: string, body: object, schema: z.ZodType<T>): Promise<T> {
  return requestBackendJson(path, schema, 200, { method: "POST", body, authorization: bffAuthSecretFromEnvironment() });
}
function bffAuthSecretFromEnvironment(): string {
  const parsed = bffConfigSchema.safeParse({
    BFF_AUTH_SECRET: process.env.BFF_AUTH_SECRET,
  });
  if (!parsed.success) {
    throw new BackendAdapterError("BFF authentication configuration is invalid.");
  }
  return parsed.data.BFF_AUTH_SECRET;
}

function validSessionToken(sessionToken: string): string {
  const parsed = sessionTokenSchema.safeParse(sessionToken);
  if (!parsed.success) {
    throw new BackendAdapterError("Backend session token is invalid.");
  }
  return parsed.data;
}
