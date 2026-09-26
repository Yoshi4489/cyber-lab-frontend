import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { cookieJar, cookieStore, cookiesMock } = vi.hoisted(() => {
  const cookieJar = new Map<string, string>();
  const cookieStore = {
    get: vi.fn((name: string) => {
      const value = cookieJar.get(name);
      return value === undefined ? undefined : { name, value };
    }),
    set: vi.fn((cookie: { name: string; value: string }) => {
      cookieJar.set(cookie.name, cookie.value);
    }),
    delete: vi.fn((name: string) => {
      cookieJar.delete(name);
    }),
  };
  return { cookieJar, cookieStore, cookiesMock: vi.fn(async () => cookieStore) };
});

vi.mock("next/headers", () => ({ cookies: cookiesMock }));

import {
  BACKEND_SESSION_COOKIE,
  clearBackendSessionCookie,
  readBackendSessionCookie,
  setBackendSessionCookie,
} from "../../src/features/backend/bff-session";

const originalBffSessionSecret = process.env.BFF_SESSION_SECRET;
const payload = {
  sessionToken: "A".repeat(43),
  absoluteExpiresAt: "2026-12-22T00:00:00.000Z",
};

beforeEach(() => {
  cookieJar.clear();
  vi.clearAllMocks();
  process.env.BFF_SESSION_SECRET = "test-only-session-sealing-secret-value";
  vi.stubEnv("NODE_ENV", "test");
});

afterEach(() => {
  restore("BFF_SESSION_SECRET", originalBffSessionSecret);
  vi.unstubAllEnvs();
});

describe("BFF backend session cookie", () => {
  it("stores only a sealed session using secure cookie attributes", async () => {
    await setBackendSessionCookie(payload);

    const stored = cookieJar.get(BACKEND_SESSION_COOKIE);
    expect(stored).toBeDefined();
    expect(stored).not.toContain(payload.sessionToken);
    expect(cookieStore.set).toHaveBeenCalledWith(
      expect.objectContaining({
        name: BACKEND_SESSION_COOKIE,
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
        priority: "high",
        expires: new Date(payload.absoluteExpiresAt),
      }),
    );
    await expect(readBackendSessionCookie()).resolves.toEqual(payload);
  });

  it("deletes an invalid sealed session instead of returning a credential", async () => {
    cookieJar.set(BACKEND_SESSION_COOKIE, "tampered-cookie");

    await expect(readBackendSessionCookie()).resolves.toBeNull();
    expect(cookieStore.delete).toHaveBeenCalledWith(BACKEND_SESSION_COOKIE);
    expect(cookieJar.has(BACKEND_SESSION_COOKIE)).toBe(false);
  });

  it("requires HTTPS cookie transport in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await setBackendSessionCookie(payload);

    expect(cookieStore.set).toHaveBeenCalledWith(
      expect.objectContaining({ secure: true }),
    );
  });

  it("clears the cookie explicitly", async () => {
    cookieJar.set(BACKEND_SESSION_COOKIE, "a-sealed-value");

    await clearBackendSessionCookie();

    expect(cookieStore.delete).toHaveBeenCalledWith(BACKEND_SESSION_COOKIE);
    expect(cookieJar.has(BACKEND_SESSION_COOKIE)).toBe(false);
  });
});

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
