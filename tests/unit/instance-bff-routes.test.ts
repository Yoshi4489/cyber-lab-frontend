import { beforeEach, describe, expect, it, vi } from "vitest";
import { BackendHttpError } from "../../src/features/backend/adapter";
import {
  BffUnauthenticatedError,
  BffUnauthorizedScopeError,
} from "../../src/features/backend/bff-authorization";

const mocks = vi.hoisted(() => ({
  createBackendInstance: vi.fn(),
  destroyBackendInstance: vi.fn(),
  extendBackendInstance: vi.fn(),
  getBackendInstance: vi.fn(),
  issueBffServiceToken: vi.fn(),
}));

vi.mock("../../src/features/backend/bff-authorization", () => ({
  BffUnauthenticatedError: class BffUnauthenticatedError extends Error {},
  BffUnauthorizedScopeError: class BffUnauthorizedScopeError extends Error {},
  issueBffServiceToken: mocks.issueBffServiceToken,
}));
vi.mock("../../src/features/backend/instance-adapter", () => ({
  createBackendInstance: mocks.createBackendInstance,
  destroyBackendInstance: mocks.destroyBackendInstance,
  extendBackendInstance: mocks.extendBackendInstance,
  getBackendInstance: mocks.getBackendInstance,
}));

import { POST as create } from "../../src/app/api/instances/route";
import { DELETE as destroy, GET as get } from "../../src/app/api/instances/[id]/route";
import { POST as extend } from "../../src/app/api/instances/[id]/extend/route";

const serviceToken = "header.payload.signature";
const challengeId = "f5d66313-2997-45af-94d7-8bcad4d9fd4f";
const instanceId = "7850ac98-88b2-4d2f-953d-3f2d5b204205";
const mutation = {
  instance: {
    id: instanceId,
    challengeId,
    status: "pending",
    createdAt: "2026-09-22T00:00:00.000Z",
    startedAt: null,
    expiresAt: "2026-09-22T01:00:00.000Z",
    absoluteExpiresAt: "2026-09-22T02:00:00.000Z",
    stoppedAt: null,
    failureCode: null,
  },
  operationId: "9c690217-87af-4d5c-a3ac-f7d5be946b4d",
  replayed: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.issueBffServiceToken.mockResolvedValue(serviceToken);
  mocks.createBackendInstance.mockResolvedValue(mutation);
  mocks.getBackendInstance.mockResolvedValue(mutation.instance);
  mocks.extendBackendInstance.mockResolvedValue(mutation);
  mocks.destroyBackendInstance.mockResolvedValue(mutation);
});

describe("BFF instance routes", () => {
  it("creates pending instance intent through the BFF with a retained idempotency key", async () => {
    const response = await create(
      mutationRequest("/api/instances", {
        challengeId,
      }, "create:instance:0001"),
    );

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual(mutation);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.issueBffServiceToken).toHaveBeenCalledWith("instances:write", true);
    expect(mocks.createBackendInstance).toHaveBeenCalledWith({
      challengeId,
      serviceToken,
      idempotencyKey: "create:instance:0001",
    });
  });

  it("rejects cross-site, identity-bearing, or non-idempotent mutations before authorization", async () => {
    const crossSite = await create(
      new Request("https://lab.ciscoku.test/api/instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId }),
      }),
    );
    expect(crossSite.status).toBe(403);
    await expect(crossSite.json()).resolves.toEqual({ code: "FORBIDDEN" });

    const identityBody = await create(
      mutationRequest("/api/instances", { challengeId, userId: "not-allowed" }, "create:instance:0002"),
    );
    expect(identityBody.status).toBe(400);
    await expect(identityBody.json()).resolves.toEqual({ code: "INVALID_REQUEST" });

    const missingKey = await destroy(
      mutationRequest(`/api/instances/${instanceId}`, undefined, undefined, "DELETE"),
      context(instanceId),
    );
    expect(missingKey.status).toBe(400);
    await expect(missingKey.json()).resolves.toEqual({ code: "INVALID_REQUEST" });
    expect(mocks.issueBffServiceToken).not.toHaveBeenCalled();
    expect(mocks.createBackendInstance).not.toHaveBeenCalled();
  });

  it("reads an owned instance with the read scope and no browser-supplied identity", async () => {
    const response = await get(new Request(`https://lab.ciscoku.test/api/instances/${instanceId}`), context(instanceId));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(mutation.instance);
    expect(mocks.issueBffServiceToken).toHaveBeenCalledWith("instances:read");
    expect(mocks.getBackendInstance).toHaveBeenCalledWith({ serviceToken, instanceId });
  });

  it("extends and destroys with empty bodies, write scope, and their caller keys", async () => {
    const extended = await extend(
      mutationRequest(`/api/instances/${instanceId}/extend`, undefined, "extend:instance:0001"),
      context(instanceId),
    );
    const destroyed = await destroy(
      mutationRequest(
        `/api/instances/${instanceId}`,
        undefined,
        "destroy:instance:0001",
        "DELETE",
      ),
      context(instanceId),
    );

    expect(extended.status).toBe(202);
    expect(destroyed.status).toBe(202);
    expect(mocks.extendBackendInstance).toHaveBeenCalledWith({
      serviceToken,
      instanceId,
      idempotencyKey: "extend:instance:0001",
    });
    expect(mocks.destroyBackendInstance).toHaveBeenCalledWith({
      serviceToken,
      instanceId,
      idempotencyKey: "destroy:instance:0001",
    });
  });

  it("returns stable session, scope, and upstream errors", async () => {
    mocks.issueBffServiceToken.mockRejectedValue(new BffUnauthenticatedError());
    const unauthenticated = await get(
      new Request(`https://lab.ciscoku.test/api/instances/${instanceId}`),
      context(instanceId),
    );
    expect(unauthenticated.status).toBe(401);
    await expect(unauthenticated.json()).resolves.toEqual({ code: "UNAUTHORIZED" });

    mocks.issueBffServiceToken.mockRejectedValue(new BffUnauthorizedScopeError());
    const forbidden = await get(
      new Request(`https://lab.ciscoku.test/api/instances/${instanceId}`),
      context(instanceId),
    );
    expect(forbidden.status).toBe(403);
    await expect(forbidden.json()).resolves.toEqual({ code: "FORBIDDEN" });

    mocks.issueBffServiceToken.mockResolvedValue(serviceToken);
    mocks.getBackendInstance.mockRejectedValue(new BackendHttpError(429, "RATE_LIMITED"));
    const rateLimited = await get(
      new Request(`https://lab.ciscoku.test/api/instances/${instanceId}`),
      context(instanceId),
    );
    expect(rateLimited.status).toBe(429);
    await expect(rateLimited.json()).resolves.toEqual({ code: "RATE_LIMITED" });
  });
});

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

function mutationRequest(
  path: string,
  body?: object,
  idempotencyKey?: string,
  method = "POST",
): Request {
  const headers = new Headers({
    Origin: "https://lab.ciscoku.test",
    "Sec-Fetch-Site": "same-origin",
  });
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (idempotencyKey) headers.set("Idempotency-Key", idempotencyKey);
  return new Request(`https://lab.ciscoku.test${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
