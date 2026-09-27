import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  BackendAdapterError,
  BackendHttpError,
  BackendResponseError,
} from "../../src/features/backend/adapter";
import {
  createBackendInstance,
  destroyBackendInstance,
  extendBackendInstance,
  getBackendInstance,
} from "../../src/features/backend/instance-adapter";
import { createBackendFixture } from "../fixtures/backend.mjs";

const originalBackendUrl = process.env.BACKEND_URL;
const serviceToken = "header.payload.signature";
const challengeId = "f5d66313-2997-45af-94d7-8bcad4d9fd4f";
const instanceId = "7850ac98-88b2-4d2f-953d-3f2d5b204205";
const fixture = createBackendFixture({ serviceToken });
let fixtureOrigin = "";

beforeAll(async () => {
  await new Promise<void>((resolve, reject) => {
    fixture.server.once("error", reject);
    fixture.server.listen(0, "127.0.0.1", resolve);
  });
  const address = fixture.server.address() as AddressInfo;
  fixtureOrigin = `http://127.0.0.1:${address.port}`;
  process.env.BACKEND_URL = fixtureOrigin;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    fixture.server.close((error) => (error ? reject(error) : resolve()));
  });
  if (originalBackendUrl === undefined) delete process.env.BACKEND_URL;
  else process.env.BACKEND_URL = originalBackendUrl;
});

beforeEach(() => {
  process.env.BACKEND_URL = fixtureOrigin;
  fixture.setScenario("healthy");
});

describe("authenticated backend instance adapter", () => {
  it("uses a scoped token and idempotency keys without sending an acting user", async () => {
    const created = await createBackendInstance({
      serviceToken,
      challengeId,
      idempotencyKey: "create:instance:0001",
    });
    const instance = await getBackendInstance({ serviceToken, instanceId });
    await extendBackendInstance({
      serviceToken,
      instanceId,
      idempotencyKey: "extend:instance:0001",
    });
    await destroyBackendInstance({
      serviceToken,
      instanceId,
      idempotencyKey: "destroy:instance:0001",
    });

    expect(created).toMatchObject({
      instance: { id: instanceId, status: "pending" },
      replayed: false,
    });
    expect(created.instance.url).toBeUndefined();
    expect(instance).toMatchObject({ id: instanceId, status: "pending" });

    const requests = fixture.requests().slice(-4);
    expect(requests).toEqual([
      expect.objectContaining({
        method: "POST",
        url: "/v1/instances",
        headers: expect.objectContaining({
          authorization: "[redacted]",
          "content-type": "application/json",
          "idempotency-key": "create:instance:0001",
        }),
        body: JSON.stringify({ challengeId }),
      }),
      expect.objectContaining({
        method: "GET",
        url: `/v1/instances/${instanceId}`,
        headers: expect.objectContaining({ authorization: "[redacted]" }),
        body: "",
      }),
      expect.objectContaining({
        method: "POST",
        url: `/v1/instances/${instanceId}/extend`,
        headers: expect.objectContaining({
          authorization: "[redacted]",
          "idempotency-key": "extend:instance:0001",
        }),
        body: "",
      }),
      expect.objectContaining({
        method: "DELETE",
        url: `/v1/instances/${instanceId}`,
        headers: expect.objectContaining({
          authorization: "[redacted]",
          "idempotency-key": "destroy:instance:0001",
        }),
        body: "",
      }),
    ]);
    for (const request of requests) {
      expect(request.body).not.toContain('"userId"');
    }
  });

  it("rejects malformed inputs before they can reach the backend", async () => {
    const requestCount = fixture.requests().length;

    await expect(
      createBackendInstance({
        serviceToken,
        challengeId,
        idempotencyKey: "short",
        userId: "not-allowed",
      } as unknown as {
        serviceToken: string;
        challengeId: string;
        idempotencyKey: string;
      }),
    ).rejects.toBeInstanceOf(BackendAdapterError);
    await expect(
      getBackendInstance({ serviceToken, instanceId: "not-a-uuid" }),
    ).rejects.toBeInstanceOf(BackendAdapterError);

    expect(fixture.requests()).toHaveLength(requestCount);
  });

  it("maps stable upstream errors and rejects malformed lifecycle responses", async () => {
    fixture.setScenario("error");
    await expect(getBackendInstance({ serviceToken, instanceId })).rejects.toMatchObject({
      name: "BackendHttpError",
      status: 429,
      code: "RATE_LIMITED",
      correlationId: "d48b142b-4929-44e9-8ac5-153771f475a4",
      message: "Backend request failed with HTTP 429.",
    } satisfies Partial<BackendHttpError>);

    fixture.setScenario("instance-url-before-running");
    await expect(getBackendInstance({ serviceToken, instanceId })).rejects.toBeInstanceOf(
      BackendResponseError,
    );
  });
});
