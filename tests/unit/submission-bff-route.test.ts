import { beforeEach, describe, expect, it, vi } from "vitest";
import { BackendHttpError } from "../../src/features/backend/adapter";
import {
  BffUnauthenticatedError,
  BffUnauthorizedScopeError,
} from "../../src/features/backend/bff-authorization";

const mocks = vi.hoisted(() => ({
  issueBffServiceToken: vi.fn(),
  submitBackendFlag: vi.fn(),
}));

vi.mock("../../src/features/backend/bff-authorization", () => ({
  BffUnauthenticatedError: class BffUnauthenticatedError extends Error {},
  BffUnauthorizedScopeError: class BffUnauthorizedScopeError extends Error {},
  issueBffServiceToken: mocks.issueBffServiceToken,
}));
vi.mock("../../src/features/backend/submission-adapter", () => ({
  submitBackendFlag: mocks.submitBackendFlag,
}));

import { POST as submit } from "../../src/app/api/submissions/route";

const serviceToken = "header.payload.signature";
const challengeId = "f5d66313-2997-45af-94d7-8bcad4d9fd4f";
const instanceId = "7850ac98-88b2-4d2f-953d-3f2d5b204205";
const flag = "CTF{bff_only}";
const result = {
  correct: true,
  points: 100,
  recorded: true,
  source: "database",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.issueBffServiceToken.mockResolvedValue(serviceToken);
  mocks.submitBackendFlag.mockResolvedValue(result);
});

describe("BFF submission route", () => {
  it("submits the exact flag contract behind the BFF without echoing the flag", async () => {
    const response = await submit(submissionRequest({ challengeId, instanceId, flag }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(result);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.issueBffServiceToken).toHaveBeenCalledWith("submissions:write");
    expect(mocks.submitBackendFlag).toHaveBeenCalledWith({
      challengeId,
      instanceId,
      flag,
      serviceToken,
    });
  });

  it("rejects cross-site and identity-bearing bodies before authorization", async () => {
    const crossSite = await submit(
      new Request("https://lab.ciscoku.test/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, instanceId, flag }),
      }),
    );
    expect(crossSite.status).toBe(403);
    await expect(crossSite.json()).resolves.toEqual({ code: "FORBIDDEN" });

    const identityBody = await submit(
      submissionRequest({
        challengeId,
        instanceId,
        flag,
        userId: "not-allowed",
      }),
    );
    expect(identityBody.status).toBe(400);
    await expect(identityBody.json()).resolves.toEqual({ code: "INVALID_REQUEST" });
    expect(mocks.issueBffServiceToken).not.toHaveBeenCalled();
    expect(mocks.submitBackendFlag).not.toHaveBeenCalled();
  });

  it("maps session, scope, and backend failures to stable codes", async () => {
    mocks.issueBffServiceToken.mockRejectedValue(new BffUnauthenticatedError());
    const unauthenticated = await submit(submissionRequest({ challengeId, instanceId, flag }));
    expect(unauthenticated.status).toBe(401);
    await expect(unauthenticated.json()).resolves.toEqual({ code: "UNAUTHORIZED" });

    mocks.issueBffServiceToken.mockRejectedValue(new BffUnauthorizedScopeError());
    const forbidden = await submit(submissionRequest({ challengeId, instanceId, flag }));
    expect(forbidden.status).toBe(403);
    await expect(forbidden.json()).resolves.toEqual({ code: "FORBIDDEN" });

    mocks.issueBffServiceToken.mockResolvedValue(serviceToken);
    mocks.submitBackendFlag.mockRejectedValue(new BackendHttpError(429, "RATE_LIMITED"));
    const rateLimited = await submit(submissionRequest({ challengeId, instanceId, flag }));
    expect(rateLimited.status).toBe(429);
    await expect(rateLimited.json()).resolves.toEqual({ code: "RATE_LIMITED" });
  });
});

function submissionRequest(body: object): Request {
  return new Request("https://lab.ciscoku.test/api/submissions", {
    method: "POST",
    headers: {
      Origin: "https://lab.ciscoku.test",
      "Content-Type": "application/json",
      "Sec-Fetch-Site": "same-origin",
    },
    body: JSON.stringify(body),
  });
}
