import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  BackendAdapterError,
  BackendHttpError,
  BackendResponseError,
} from "../../src/features/backend/adapter";
import { submitBackendFlag } from "../../src/features/backend/submission-adapter";
import { createBackendFixture } from "../fixtures/backend.mjs";

const originalBackendUrl = process.env.BACKEND_URL;
const serviceToken = "header.payload.signature";
const challengeId = "f5d66313-2997-45af-94d7-8bcad4d9fd4f";
const instanceId = "7850ac98-88b2-4d2f-953d-3f2d5b204205";
const flag = "CTF{server_side_only}";
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

describe("authenticated backend flag-submission adapter", () => {
  it("submits only the required fields with a scoped token and never echoes the flag", async () => {
    const result = await submitBackendFlag({ serviceToken, challengeId, instanceId, flag });

    expect(result).toEqual({
      correct: true,
      points: 100,
      recorded: true,
      source: "database",
    });
    expect(result).not.toHaveProperty("flag");

    const request = fixture.requests().at(-1);
    expect(request).toEqual(
      expect.objectContaining({
        method: "POST",
        url: "/v1/submissions",
        headers: expect.objectContaining({
          authorization: `Bearer ${serviceToken}`,
          "content-type": "application/json",
        }),
        body: JSON.stringify({ challengeId, instanceId, flag }),
      }),
    );
    expect(request?.body).not.toContain('"userId"');
  });

  it("rejects unexpected identity fields and malformed submissions before sending a request", async () => {
    const requestCount = fixture.requests().length;

    await expect(
      submitBackendFlag({
        serviceToken,
        challengeId,
        instanceId,
        flag,
        userId: "not-allowed",
      } as unknown as {
        serviceToken: string;
        challengeId: string;
        instanceId: string;
        flag: string;
      }),
    ).rejects.toBeInstanceOf(BackendAdapterError);
    await expect(
      submitBackendFlag({ serviceToken, challengeId, instanceId, flag: "" }),
    ).rejects.toBeInstanceOf(BackendAdapterError);

    expect(fixture.requests()).toHaveLength(requestCount);
  });

  it("maps stable backend errors and fails closed for malformed responses", async () => {
    fixture.setScenario("error");
    await expect(
      submitBackendFlag({ serviceToken, challengeId, instanceId, flag }),
    ).rejects.toMatchObject({
      name: "BackendHttpError",
      status: 429,
      code: "RATE_LIMITED",
      correlationId: "d48b142b-4929-44e9-8ac5-153771f475a4",
      message: "Backend request failed with HTTP 429.",
    } satisfies Partial<BackendHttpError>);

    fixture.setScenario("invalid");
    await expect(
      submitBackendFlag({ serviceToken, challengeId, instanceId, flag }),
    ).rejects.toBeInstanceOf(BackendResponseError);
  });
});
