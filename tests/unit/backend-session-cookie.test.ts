import { decodeProtectedHeader } from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BackendSessionCookieConfigurationError,
  BackendSessionCookieError,
  sealBackendSession,
  unsealBackendSession,
} from "../../src/features/backend/session-cookie";

const originalBffSessionSecret = process.env.BFF_SESSION_SECRET;
const bffSessionSecret = "test-only-session-sealing-secret-value";
const payload = {
  sessionToken: "A".repeat(43),
  absoluteExpiresAt: "2026-12-22T00:00:00.000Z",
};

afterEach(() => {
  vi.useRealTimers();
  restore("BFF_SESSION_SECRET", originalBffSessionSecret);
});

describe("backend session cookie", () => {
  it("encrypts the opaque session token with the dedicated frontend secret", async () => {
    configure();

    const sealed = await sealBackendSession(payload);

    expect(sealed.split(".")).toHaveLength(5);
    expect(sealed).not.toContain(payload.sessionToken);
    expect(decodeProtectedHeader(sealed)).toMatchObject({
      alg: "dir",
      enc: "A256GCM",
      typ: "ciscoku-backend-session",
    });
    await expect(unsealBackendSession(sealed)).resolves.toEqual(payload);
  });

  it("rejects tampering, secret rotation, and expired session references", async () => {
    configure();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-27T00:00:00.000Z"));
    const sealed = await sealBackendSession(payload);

    await expect(unsealBackendSession(`${sealed}x`)).rejects.toBeInstanceOf(
      BackendSessionCookieError,
    );

    process.env.BFF_SESSION_SECRET = "rotated-session-sealing-secret-value";
    await expect(unsealBackendSession(sealed)).rejects.toBeInstanceOf(
      BackendSessionCookieError,
    );

    configure();
    vi.setSystemTime(new Date("2027-01-01T00:00:00.000Z"));
    await expect(unsealBackendSession(sealed)).rejects.toBeInstanceOf(
      BackendSessionCookieError,
    );
  });

  it("fails closed for invalid input and missing configuration", async () => {
    configure();
    await expect(
      sealBackendSession({ ...payload, sessionToken: "not-an-opaque-session-token" }),
    ).rejects.toBeInstanceOf(BackendSessionCookieError);

    delete process.env.BFF_SESSION_SECRET;
    await expect(
      unsealBackendSession("not-a-sealed-session"),
    ).rejects.toBeInstanceOf(BackendSessionCookieConfigurationError);
  });
});

function configure() {
  process.env.BFF_SESSION_SECRET = bffSessionSecret;
}

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
