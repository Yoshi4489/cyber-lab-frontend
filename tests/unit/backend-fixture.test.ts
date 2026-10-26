import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import { createBackendFixture } from "../fixtures/backend.mjs";
import { backendFixtureAddress } from "../fixtures/backend-origin.mjs";

const serviceTokenSecret = "fixture-only-service-token-secret-value";
const serviceTokenIssuer = "fixture-frontend";
const serviceTokenAudience = "fixture-backend";
const userId = "d7c932ea-e0ad-41bb-99e3-b4f9d0971e28";
const sessionId = "943eced9-5a8e-4160-80c5-ef9021aab53f";
const instanceId = "7850ac98-88b2-4d2f-953d-3f2d5b204205";
const fixture = createBackendFixture({
  bffAuthSecret: "fixture-only-bff-authentication-value",
  serviceTokenSecret,
  serviceTokenIssuer,
  serviceTokenAudience,
});
let fixtureOrigin = "";

afterEach(() => { vi.unstubAllEnvs(); fixture.setScenario("healthy"); });

beforeAll(async () => {
  await new Promise<void>((resolve, reject) => {
    fixture.server.once("error", reject);
    fixture.server.listen(0, "127.0.0.1", resolve);
  });
  const address = fixture.server.address() as AddressInfo;
  fixtureOrigin = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    fixture.server.close((error) => (error ? reject(error) : resolve()));
  });
});

describe("loopback backend fixture", () => {
  it("Welcome login rejects ordinary incorrect credentials without leaking an account", async () => {
    fixture.setScenario("welcome");
    for (const email of ["learner@example.test", "unknown@example.test"]) {
      const response = await fetch(`${fixtureOrigin}/v1/auth/login`, { method: "POST", headers: { Authorization: "Bearer fixture-only-bff-authentication-value" }, body: JSON.stringify({ email, password: "ordinary-wrong-password" }) });
      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({ code: "UNAUTHORIZED", message: "Invalid credentials." });
    }
  });
  it("Welcome keeps two verified learner sessions independent across restoration and logout", async () => {
    fixture.setScenario("welcome");
    const post = (path: string, body: unknown) => fetch(`${fixtureOrigin}/v1/auth/${path}`, { method: "POST", headers: { Authorization: "Bearer fixture-only-bff-authentication-value" }, body: JSON.stringify(body) });
    const first = await (await post("login", { email: "learner@example.test", password: "correct-horse-battery-staple" })).json();
    const second = await (await post("login", { email: "learner-b@example.test", password: "correct-horse-battery-staple" })).json();
    expect(first.user.emailVerified).toBe(true); expect(second.user.emailVerified).toBe(true);
    expect(first.user.id).not.toBe(second.user.id);
    expect((await (await post("session", { sessionToken: first.sessionToken })).json()).user.displayName).toBe("Loopback Learner");
    expect((await (await post("session", { sessionToken: second.sessionToken })).json()).user.displayName).toBe("Second Learner");
    expect((await post("logout", { sessionToken: first.sessionToken })).status).toBe(204);
    expect((await post("session", { sessionToken: first.sessionToken })).status).toBe(401);
    expect((await post("session", { sessionToken: second.sessionToken })).status).toBe(200);
  });
  it("defaults to the established port and applies an explicit loopback-only override", () => {
    vi.stubEnv("BACKEND_FIXTURE_PORT", undefined);
    expect(backendFixtureAddress()).toEqual({ port: 4101, origin: "http://127.0.0.1:4101" });
    vi.stubEnv("BACKEND_FIXTURE_PORT", "54001");
    expect(backendFixtureAddress()).toEqual({ port: 54001, origin: "http://127.0.0.1:54001" });
  });

  it("rejects invalid ports and address-shaped overrides before a server is started", () => {
    for (const value of ["0", "65536", "-1", "3.5", "3e3", "", " 4101 ", "127.0.0.1:4101"]) {
      expect(() => backendFixtureAddress(value)).toThrow("BACKEND_FIXTURE_PORT");
    }
  });

  it("accepts only the service-token scope required by the operation", async () => {
    const readToken = await token("instances:read");
    const read = await fetch(`${fixtureOrigin}/v1/instances/${instanceId}`, {
      headers: { Authorization: `Bearer ${readToken}` },
    });
    expect(read.status).toBe(200);

    const wrongScope = await fetch(`${fixtureOrigin}/v1/instances/${instanceId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${readToken}`,
        "Idempotency-Key": "destroy:fixture:0001",
      },
    });
    expect(wrongScope.status).toBe(401);
  });

  it("exposes only redacted request diagnostics", async () => {
    const response = await fetch(`${fixtureOrigin}/requests`);
    const diagnostics = (await response.json()) as {
      requests: Array<{ headers: Record<string, string>; body: string }>;
    };

    expect(diagnostics.requests.at(-1)?.headers.authorization).toBe("[redacted]");
    expect(JSON.stringify(diagnostics)).not.toContain("Bearer ");
    expect(JSON.stringify(diagnostics)).not.toContain(serviceTokenSecret);
  });
});

function token(scope: string): Promise<string> {
  return new SignJWT({ sid: sessionId, scope })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuer(serviceTokenIssuer)
    .setAudience(serviceTokenAudience)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(new TextEncoder().encode(serviceTokenSecret));
}
