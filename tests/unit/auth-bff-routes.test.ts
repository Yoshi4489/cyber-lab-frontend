import { beforeEach, describe, expect, it, vi } from "vitest";
import { BackendHttpError } from "../../src/features/backend/adapter";
import { BackendSessionCookieConfigurationError } from "../../src/features/backend/session-cookie";

const mocks = vi.hoisted(() => ({
  loginBackend: vi.fn(),
  logoutBackendSession: vi.fn(),
  resolveBackendSession: vi.fn(),
  setBackendSessionCookie: vi.fn(),
  clearBackendSessionCookie: vi.fn(),
  readBackendSessionCookie: vi.fn(),
}));

vi.mock("../../src/features/backend/auth-adapter", () => ({
  loginBackend: mocks.loginBackend,
  logoutBackendSession: mocks.logoutBackendSession,
  resolveBackendSession: mocks.resolveBackendSession,
}));
vi.mock("../../src/features/backend/bff-session", () => ({
  setBackendSessionCookie: mocks.setBackendSessionCookie,
  clearBackendSessionCookie: mocks.clearBackendSessionCookie,
  readBackendSessionCookie: mocks.readBackendSessionCookie,
}));

import { POST as login } from "../../src/app/api/auth/login/route";
import { POST as logout } from "../../src/app/api/auth/logout/route";
import { GET as session } from "../../src/app/api/auth/session/route";

const rawCookieSession = {
  sessionToken: "A".repeat(43),
  absoluteExpiresAt: "2026-12-22T00:00:00.000Z",
};
const resolvedSession = {
  sessionId: "943eced9-5a8e-4160-80c5-ef9021aab53f",
  user: {
    id: "d7c932ea-e0ad-41bb-99e3-b4f9d0971e28",
    email: "learner@example.test",
    displayName: "Learner",
    role: "player",
    emailVerified: true,
  },
  allowedScopes: ["instances:read"],
  idleExpiresAt: "2026-10-22T00:00:00.000Z",
  absoluteExpiresAt: rawCookieSession.absoluteExpiresAt,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.loginBackend.mockResolvedValue({ ...resolvedSession, ...rawCookieSession });
  mocks.resolveBackendSession.mockResolvedValue(resolvedSession);
  mocks.readBackendSessionCookie.mockResolvedValue(rawCookieSession);
  mocks.setBackendSessionCookie.mockResolvedValue(undefined);
  mocks.clearBackendSessionCookie.mockResolvedValue(undefined);
  mocks.logoutBackendSession.mockResolvedValue(undefined);
});

describe("BFF authentication routes", () => {
  it("logs in with only credentials and never returns an opaque token or user id", async () => {
    const response = await login(mutationRequest("/api/auth/login", {
      email: "learner@example.test",
      password: "correct-horse-battery-staple",
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      authenticated: true,
      user: { displayName: "Learner", emailVerified: true },
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.loginBackend).toHaveBeenCalledWith({
      email: "learner@example.test",
      password: "correct-horse-battery-staple",
    });
    expect(mocks.setBackendSessionCookie).toHaveBeenCalledWith(rawCookieSession);
  });

  it("rejects missing origins and unexpected acting-user fields before login", async () => {
    const noOrigin = await login(
      new Request("https://lab.ciscoku.test/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "learner@example.test",
          password: "correct-horse-battery-staple",
        }),
      }),
    );
    expect(noOrigin.status).toBe(403);
    await expect(noOrigin.json()).resolves.toEqual({ code: "FORBIDDEN" });

    const extraIdentity = await login(mutationRequest("/api/auth/login", {
      email: "learner@example.test",
      password: "correct-horse-battery-staple",
      userId: resolvedSession.user.id,
    }));
    expect(extraIdentity.status).toBe(400);
    await expect(extraIdentity.json()).resolves.toEqual({ code: "INVALID_REQUEST" });
    expect(mocks.loginBackend).not.toHaveBeenCalled();
  });

  it("relays only stable upstream error codes", async () => {
    mocks.loginBackend.mockRejectedValue(
      new BackendHttpError(
        429,
        "RATE_LIMITED",
        "d48b142b-4929-44e9-8ac5-153771f475a4",
      ),
    );

    const response = await login(mutationRequest("/api/auth/login", {
      email: "learner@example.test",
      password: "correct-horse-battery-staple",
    }));

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({ code: "RATE_LIMITED" });
  });

  it("reports the current trusted session without its backend identity", async () => {
    const response = await session();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      authenticated: true,
      user: { displayName: "Learner", emailVerified: true },
    });
    expect(mocks.resolveBackendSession).toHaveBeenCalledWith(rawCookieSession.sessionToken);
  });

  it("clears an expired backend session and reports an unauthenticated state", async () => {
    mocks.resolveBackendSession.mockRejectedValue(new BackendHttpError(401, "UNAUTHORIZED"));

    const response = await session();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ authenticated: false });
    expect(mocks.clearBackendSessionCookie).toHaveBeenCalledOnce();
  });

  it("returns a stable failure when session-sealing configuration is unavailable", async () => {
    mocks.readBackendSessionCookie.mockRejectedValue(
      new BackendSessionCookieConfigurationError(),
    );

    const response = await session();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ code: "INTERNAL_ERROR" });
  });

  it("logs out through the BFF and clears the sealed cookie", async () => {
    const response = await logout(mutationRequest("/api/auth/logout"));

    expect(response.status).toBe(204);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.logoutBackendSession).toHaveBeenCalledWith(rawCookieSession.sessionToken);
    expect(mocks.clearBackendSessionCookie).toHaveBeenCalledOnce();
  });
});

function mutationRequest(path: string, body?: object): Request {
  return new Request(`https://lab.ciscoku.test${path}`, {
    method: "POST",
    headers: {
      Origin: "https://lab.ciscoku.test",
      "Content-Type": "application/json",
      "Sec-Fetch-Site": "same-origin",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
