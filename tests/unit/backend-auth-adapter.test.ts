import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { BackendAdapterError, BackendHttpError, BackendResponseError } from "../../src/features/backend/adapter";
import {
  loginBackend,
  logoutBackendSession,
  resolveBackendSession,
} from "../../src/features/backend/auth-adapter";
import { createBackendFixture } from "../fixtures/backend.mjs";

const originalBackendUrl = process.env.BACKEND_URL;
const originalBffAuthSecret = process.env.BFF_AUTH_SECRET;
const bffAuthSecret = "test-only-bff-authentication-secret-value";
const sessionToken = "A".repeat(43);
const fixture = createBackendFixture({ bffAuthSecret });
let fixtureOrigin = "";

beforeAll(async () => {
  await new Promise<void>((resolve, reject) => {
    fixture.server.once("error", reject);
    fixture.server.listen(0, "127.0.0.1", resolve);
  });
  const address = fixture.server.address() as AddressInfo;
  fixtureOrigin = `http://127.0.0.1:${address.port}`;
  process.env.BACKEND_URL = fixtureOrigin;
  process.env.BFF_AUTH_SECRET = bffAuthSecret;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    fixture.server.close((error) => (error ? reject(error) : resolve()));
  });
  restore("BACKEND_URL", originalBackendUrl);
  restore("BFF_AUTH_SECRET", originalBffAuthSecret);
});

beforeEach(() => {
  process.env.BACKEND_URL = fixtureOrigin;
  process.env.BFF_AUTH_SECRET = bffAuthSecret;
  fixture.setScenario("healthy");
});

describe("backend BFF authentication adapter", () => {
  it("uses the deployment credential while keeping user identity out of request bodies", async () => {
    const login = await loginBackend({
      email: "learner@example.test",
      password: "correct-horse-battery-staple",
    });
    const session = await resolveBackendSession(login.sessionToken);
    await logoutBackendSession(login.sessionToken);

    expect(login.sessionToken).toBe(sessionToken);
    expect(session).toMatchObject({
      sessionId: "943eced9-5a8e-4160-80c5-ef9021aab53f",
      user: { id: "d7c932ea-e0ad-41bb-99e3-b4f9d0971e28", role: "player" },
      allowedScopes: ["instances:read", "instances:write", "submissions:write"],
    });

    const requests = fixture.requests().slice(-3);
    expect(requests).toEqual([
      expect.objectContaining({
        method: "POST",
        url: "/v1/auth/login",
        headers: expect.objectContaining({
          authorization: "[redacted]",
          "content-type": "application/json",
        }),
        body: JSON.stringify({ email: "[redacted]", password: "[redacted]" }),
      }),
      expect.objectContaining({
        method: "POST",
        url: "/v1/auth/session",
        headers: expect.objectContaining({ authorization: "[redacted]" }),
        body: JSON.stringify({ sessionToken: "[redacted]" }),
      }),
      expect.objectContaining({
        method: "POST",
        url: "/v1/auth/logout",
        headers: expect.objectContaining({ authorization: "[redacted]" }),
        body: JSON.stringify({ sessionToken: "[redacted]" }),
      }),
    ]);
    for (const request of requests) {
      expect(request.body).not.toContain('"userId"');
    }
  });

  it("maps upstream errors without exposing their message", async () => {
    fixture.setScenario("error");

    await expect(
      loginBackend({
        email: "learner@example.test",
        password: "correct-horse-battery-staple",
      }),
    ).rejects.toMatchObject({
      name: "BackendHttpError",
      status: 429,
      code: "RATE_LIMITED",
      correlationId: "d48b142b-4929-44e9-8ac5-153771f475a4",
      message: "Backend request failed with HTTP 429.",
    } satisfies Partial<BackendHttpError>);
  });

  it("fails closed for malformed responses and missing BFF configuration", async () => {
    fixture.setScenario("invalid");
    await expect(
      loginBackend({
        email: "learner@example.test",
        password: "correct-horse-battery-staple",
      }),
    ).rejects.toBeInstanceOf(BackendResponseError);

    delete process.env.BFF_AUTH_SECRET;
    await expect(resolveBackendSession(sessionToken)).rejects.toBeInstanceOf(
      BackendAdapterError,
    );
  });
});

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
