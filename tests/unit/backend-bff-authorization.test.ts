import { beforeEach, describe, expect, it, vi } from "vitest";
import { BackendHttpError } from "../../src/features/backend/adapter";

const mocks = vi.hoisted(() => ({
  clearBackendSessionCookie: vi.fn(),
  issueBackendServiceToken: vi.fn(),
  readBackendSessionCookie: vi.fn(),
  resolveBackendSession: vi.fn(),
}));

vi.mock("../../src/features/backend/auth-adapter", () => ({
  resolveBackendSession: mocks.resolveBackendSession,
}));
vi.mock("../../src/features/backend/bff-session", () => ({
  clearBackendSessionCookie: mocks.clearBackendSessionCookie,
  readBackendSessionCookie: mocks.readBackendSessionCookie,
}));
vi.mock("../../src/features/backend/service-token", () => ({
  issueBackendServiceToken: mocks.issueBackendServiceToken,
}));

import {
  BffUnauthenticatedError,
  BffUnauthorizedScopeError,
  issueBffServiceToken,
} from "../../src/features/backend/bff-authorization";

const cookieSession = {
  sessionToken: "A".repeat(43),
  absoluteExpiresAt: "2026-12-22T00:00:00.000Z",
};
const resolvedSession = {
  sessionId: "943eced9-5a8e-4160-80c5-ef9021aab53f",
  user: {
    id: "d7c932ea-e0ad-41bb-99e3-b4f9d0971e28",
    email: "learner@example.test",
    displayName: "Learner",
    role: "player" as const,
    emailVerified: true,
  },
  allowedScopes: ["instances:read", "instances:write"],
  idleExpiresAt: "2026-10-22T00:00:00.000Z",
  absoluteExpiresAt: cookieSession.absoluteExpiresAt,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.readBackendSessionCookie.mockResolvedValue(cookieSession);
  mocks.resolveBackendSession.mockResolvedValue(resolvedSession);
  mocks.issueBackendServiceToken.mockResolvedValue("header.payload.signature");
  mocks.clearBackendSessionCookie.mockResolvedValue(undefined);
});

describe("BFF backend authorization", () => {
  it("derives the service token from the trusted session and required scope", async () => {
    await expect(issueBffServiceToken("instances:write")).resolves.toBe(
      "header.payload.signature",
    );

    expect(mocks.resolveBackendSession).toHaveBeenCalledWith(cookieSession.sessionToken);
    expect(mocks.issueBackendServiceToken).toHaveBeenCalledWith(
      resolvedSession,
      "instances:write",
    );
  });

  it("fails unauthenticated requests without minting a service token", async () => {
    mocks.readBackendSessionCookie.mockResolvedValue(null);

    await expect(issueBffServiceToken("instances:read")).rejects.toBeInstanceOf(
      BffUnauthenticatedError,
    );
    expect(mocks.resolveBackendSession).not.toHaveBeenCalled();
    expect(mocks.issueBackendServiceToken).not.toHaveBeenCalled();
  });

  it("clears a stale session before rejecting it", async () => {
    mocks.resolveBackendSession.mockRejectedValue(
      new BackendHttpError(401, "UNAUTHORIZED"),
    );

    await expect(issueBffServiceToken("instances:read")).rejects.toBeInstanceOf(
      BffUnauthenticatedError,
    );
    expect(mocks.clearBackendSessionCookie).toHaveBeenCalledOnce();
    expect(mocks.issueBackendServiceToken).not.toHaveBeenCalled();
  });

  it("rejects unverified creation without blocking cleanup", async () => {
    mocks.resolveBackendSession.mockResolvedValue({ ...resolvedSession, user: { ...resolvedSession.user, emailVerified: false } });
    await expect(issueBffServiceToken("instances:write", true)).rejects.toBeInstanceOf(BffUnauthorizedScopeError);
    expect(mocks.issueBackendServiceToken).not.toHaveBeenCalled();
    await expect(issueBffServiceToken("instances:write")).resolves.toBe("header.payload.signature");
  });

  it("rejects a scope absent from the trusted session", async () => {
    mocks.resolveBackendSession.mockResolvedValue({
      ...resolvedSession,
      allowedScopes: ["instances:read"],
    });

    await expect(issueBffServiceToken("instances:write")).rejects.toBeInstanceOf(
      BffUnauthorizedScopeError,
    );
    expect(mocks.issueBackendServiceToken).not.toHaveBeenCalled();
  });

  it("preserves a non-session backend failure for the route to map safely", async () => {
    const upstream = new BackendHttpError(429, "RATE_LIMITED");
    mocks.resolveBackendSession.mockRejectedValue(upstream);

    await expect(issueBffServiceToken("instances:read")).rejects.toBe(upstream);
    expect(mocks.clearBackendSessionCookie).not.toHaveBeenCalled();
  });
});
