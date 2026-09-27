import "server-only";
import { CompactEncrypt, compactDecrypt } from "jose";
import { z } from "zod";

const bffSessionConfigSchema = z.object({
  BFF_SESSION_SECRET: z.string().min(32),
});
const sessionPayloadSchema = z
  .object({
    sessionToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
    absoluteExpiresAt: z.iso.datetime(),
  })
  .strict();
const protectedHeader = {
  alg: "dir",
  enc: "A256GCM",
  typ: "ciscoku-backend-session",
} as const;

export type BackendSessionCookiePayload = z.infer<typeof sessionPayloadSchema>;

export class BackendSessionCookieError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackendSessionCookieError";
  }
}

export class BackendSessionCookieConfigurationError extends BackendSessionCookieError {
  constructor() {
    super("Backend session cookie configuration is invalid.");
    this.name = "BackendSessionCookieConfigurationError";
  }
}

/**
 * Encrypts the opaque backend credential before a future BFF route stores it
 * in an HttpOnly cookie. The browser never receives the decrypted token.
 */
export async function sealBackendSession(
  payload: BackendSessionCookiePayload,
): Promise<string> {
  const session = validSessionPayload(payload);
  const plaintext = new TextEncoder().encode(JSON.stringify(session));

  return new CompactEncrypt(plaintext)
    .setProtectedHeader(protectedHeader)
    .encrypt(await sessionEncryptionKey());
}

export async function unsealBackendSession(
  sealedSession: string,
): Promise<BackendSessionCookiePayload> {
  try {
    const decrypted = await compactDecrypt(sealedSession, await sessionEncryptionKey(), {
      keyManagementAlgorithms: [protectedHeader.alg],
      contentEncryptionAlgorithms: [protectedHeader.enc],
    });
    if (
      decrypted.protectedHeader.alg !== protectedHeader.alg ||
      decrypted.protectedHeader.enc !== protectedHeader.enc ||
      decrypted.protectedHeader.typ !== protectedHeader.typ
    ) {
      throw new BackendSessionCookieError("Backend session cookie is invalid.");
    }

    return validSessionPayload(JSON.parse(new TextDecoder().decode(decrypted.plaintext)));
  } catch (error) {
    if (error instanceof BackendSessionCookieError) throw error;
    throw new BackendSessionCookieError("Backend session cookie is invalid.");
  }
}

async function sessionEncryptionKey(): Promise<Uint8Array> {
  const config = bffSessionConfigSchema.safeParse({
    BFF_SESSION_SECRET: process.env.BFF_SESSION_SECRET,
  });
  if (!config.success) {
    throw new BackendSessionCookieConfigurationError();
  }

  return new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(config.data.BFF_SESSION_SECRET),
    ),
  );
}

function validSessionPayload(payload: unknown): BackendSessionCookiePayload {
  const parsed = sessionPayloadSchema.safeParse(payload);
  if (!parsed.success || Date.parse(parsed.data.absoluteExpiresAt) <= Date.now()) {
    throw new BackendSessionCookieError("Backend session cookie is invalid.");
  }
  return parsed.data;
}
