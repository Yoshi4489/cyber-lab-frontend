import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { createBackendFixture } from "../fixtures/backend.mjs";

const serviceTokenSecret = "fixture-only-service-token-secret-value";
const serviceTokenIssuer = "fixture-frontend";
const serviceTokenAudience = "fixture-backend";
const userId = "d7c932ea-e0ad-41bb-99e3-b4f9d0971e28";
const sessionId = "943eced9-5a8e-4160-80c5-ef9021aab53f";
const instanceId = "7850ac98-88b2-4d2f-953d-3f2d5b204205";
const fixture = createBackendFixture({
  serviceTokenSecret,
  serviceTokenIssuer,
  serviceTokenAudience,
});
let fixtureOrigin = "";

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
