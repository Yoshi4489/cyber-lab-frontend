import { beforeEach, describe, expect, it, vi } from "vitest";
import { BackendHttpError, BackendResponseError } from "../../src/features/backend/adapter";
import {
  BffUnauthenticatedError,
  BffUnauthorizedScopeError,
} from "../../src/features/backend/bff-authorization";

const mocks = vi.hoisted(() => ({
  issueBffServiceToken: vi.fn(),
  getBackendProfile: vi.fn(),
  getBackendLeaderboard: vi.fn(),
}));

vi.mock("../../src/features/backend/bff-authorization", async importOriginal => ({
  ...await importOriginal<typeof import("../../src/features/backend/bff-authorization")>(),
  issueBffServiceToken: mocks.issueBffServiceToken,
}));
vi.mock("../../src/features/backend/progress-adapter", () => ({
  getBackendProfile: mocks.getBackendProfile,
}));
vi.mock("../../src/features/backend/adapter", async importOriginal => ({
  ...await importOriginal<typeof import("../../src/features/backend/adapter")>(),
  getBackendLeaderboard: mocks.getBackendLeaderboard,
}));

import { GET as profile } from "../../src/app/api/profile/route";
import { GET as leaderboard } from "../../src/app/api/leaderboard/route";

const serviceToken = "header.payload.signature";
const profileBody = {
  userId: "7850ac98-88b2-4d2f-953d-3f2d5b204205",
  displayName: "Welcome learner",
  bio: null,
  totalPoints: 10,
  solvedCount: 1,
  availableChallenges: 1,
  solves: [{
    challengeId: "88888888-8888-4888-8888-888888888888",
    slug: "welcome",
    title: "Welcome",
    points: 10,
    solvedAt: "2026-10-27T09:00:00.000Z",
  }],
};
const leaderboardBody = {
  entries: [{ rank: 1, displayName: "Welcome learner", totalPoints: 10, solvedCount: 1, lastSolvedAt: "2026-10-27T09:00:00.000Z" }],
  source: "database",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.issueBffServiceToken.mockResolvedValue(serviceToken);
  mocks.getBackendProfile.mockResolvedValue(profileBody);
  mocks.getBackendLeaderboard.mockResolvedValue(leaderboardBody);
});

describe("BFF profile route", () => {
  it("forwards the validated DTO using only a profile:read token", async () => {
    const response = await profile();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual(profileBody);
    expect(mocks.issueBffServiceToken).toHaveBeenCalledExactlyOnceWith("profile:read");
    expect(mocks.getBackendProfile).toHaveBeenCalledExactlyOnceWith(serviceToken);
  });

  it("maps session, scope, and backend failures to the BFF envelope", async () => {
    mocks.issueBffServiceToken.mockRejectedValueOnce(new BffUnauthenticatedError());
    const unauthenticated = await profile();
    expect(unauthenticated.status).toBe(401);
    await expect(unauthenticated.json()).resolves.toEqual({ code: "UNAUTHORIZED" });

    mocks.issueBffServiceToken.mockRejectedValueOnce(new BffUnauthorizedScopeError());
    const forbidden = await profile();
    expect(forbidden.status).toBe(403);
    await expect(forbidden.json()).resolves.toEqual({ code: "FORBIDDEN" });

    mocks.getBackendProfile.mockRejectedValueOnce(new BackendHttpError(404, "NOT_FOUND"));
    const missing = await profile();
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({ code: "NOT_FOUND" });

    mocks.getBackendProfile.mockRejectedValueOnce(new BackendResponseError());
    const malformed = await profile();
    expect(malformed.status).toBe(503);
    await expect(malformed.json()).resolves.toEqual({ code: "INTERNAL_ERROR" });
    expect(mocks.getBackendProfile).toHaveBeenCalledTimes(2);
  });
});

describe("BFF leaderboard route", () => {
  it("forwards public rankings without resolving a session", async () => {
    const response = await leaderboard();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual(leaderboardBody);
    expect(mocks.issueBffServiceToken).not.toHaveBeenCalled();
  });

  it("returns the BFF envelope when rankings are unavailable", async () => {
    mocks.getBackendLeaderboard.mockRejectedValueOnce(new BackendHttpError(429, "RATE_LIMITED"));
    const limited = await leaderboard();
    expect(limited.status).toBe(429);
    await expect(limited.json()).resolves.toEqual({ code: "RATE_LIMITED" });
  });
});
