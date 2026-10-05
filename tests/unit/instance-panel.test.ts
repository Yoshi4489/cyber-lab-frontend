import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createInstance,
  destroyInstance,
  extendInstance,
  formatCountdown,
  isActive,
  isChallengeId,
  isTransitional,
  isValidIdempotencyKey,
  newIdempotencyKey,
  readInstance,
  remainingMs,
  targetUrlFor,
  type Instance,
  type InstanceStatus,
} from "../../src/features/instances/client";

const challengeId = "f5d66313-2997-45af-94d7-8bcad4d9fd4f";
const instanceId = "7850ac98-88b2-4d2f-953d-3f2d5b204205";
const operationId = "1f1f9d4b-8b3f-4f8c-9a0e-5c1d6f0a7b21";
const pendingInstance: Instance = {
  id: instanceId,
  challengeId,
  status: "pending",
  createdAt: "2026-09-28T12:00:00.000Z",
  startedAt: null,
  expiresAt: "2026-09-28T13:00:00.000Z",
  absoluteExpiresAt: "2026-09-28T14:00:00.000Z",
  stoppedAt: null,
  failureCode: null,
};
const runningInstance: Instance = {
  ...pendingInstance,
  status: "running",
  startedAt: "2026-09-28T12:00:30.000Z",
  url: "https://target.example.test",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function stubFetch(respond: Response | (() => never)) {
  const fetchMock = vi.fn<
    (input: string, init?: RequestInit) => Promise<Response>
  >(async () => (typeof respond === "function" ? respond() : respond));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function lastInit(fetchMock: ReturnType<typeof stubFetch>): RequestInit {
  return fetchMock.mock.calls.at(-1)?.[1] ?? {};
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("instance BFF client", () => {
  it("retains distinct, contract-shaped idempotency keys per operation", () => {
    const first = newIdempotencyKey("create");
    const second = newIdempotencyKey("create");

    expect(first).not.toBe(second);
    expect(first.startsWith("create:")).toBe(true);
    expect(newIdempotencyKey("extend").startsWith("extend:")).toBe(true);
    expect(newIdempotencyKey("destroy").startsWith("destroy:")).toBe(true);
    for (const key of [first, second, newIdempotencyKey("destroy")]) {
      expect(isValidIdempotencyKey(key)).toBe(true);
    }
    expect(isValidIdempotencyKey("short")).toBe(false);
    expect(isValidIdempotencyKey("has spaces and !")).toBe(false);
  });

  it("creates an instance without sending an acting user identifier", async () => {
    const fetchMock = stubFetch(
      jsonResponse(
        { instance: pendingInstance, operationId, replayed: false },
        202,
      ),
    );

    const result = await createInstance(challengeId, "create:smoke:0001");

    expect(result).toEqual({
      ok: true,
      value: { instance: pendingInstance, operationId, replayed: false },
    });
    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe("/api/instances");

    const init = lastInit(fetchMock);
    expect(init.method).toBe("POST");
    expect(init.cache).toBe("no-store");
    expect(init.credentials).toBe("same-origin");
    expect(init.redirect).toBe("error");
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
      "Idempotency-Key": "create:smoke:0001",
    });
    expect(JSON.parse(String(init.body))).toEqual({ challengeId });
    expect(String(init.body)).not.toContain("userId");
  });

  it("polls an instance with no idempotency key and no body", async () => {
    const fetchMock = stubFetch(jsonResponse(pendingInstance, 200));

    const result = await readInstance(instanceId);

    expect(result).toEqual({ ok: true, value: pendingInstance });
    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe(`/api/instances/${instanceId}`);

    const init = lastInit(fetchMock);
    expect(init.method).toBe("GET");
    expect(init.headers).toBeUndefined();
    expect(init.body).toBeUndefined();
  });

  it("extends and destroys with a retained key and an empty body", async () => {
    const mutation = { instance: pendingInstance, operationId, replayed: true };

    const extendMock = stubFetch(jsonResponse(mutation, 202));
    expect(await extendInstance(instanceId, "extend:smoke:0001")).toEqual({
      ok: true,
      value: mutation,
    });
    expect(extendMock.mock.calls.at(-1)?.[0]).toBe(
      `/api/instances/${instanceId}/extend`,
    );
    expect(lastInit(extendMock).method).toBe("POST");
    expect(lastInit(extendMock).body).toBeUndefined();
    expect(lastInit(extendMock).headers).toEqual({
      "Idempotency-Key": "extend:smoke:0001",
    });

    const destroyMock = stubFetch(jsonResponse(mutation, 202));
    expect(await destroyInstance(instanceId, "destroy:smoke:0001")).toEqual({
      ok: true,
      value: mutation,
    });
    expect(destroyMock.mock.calls.at(-1)?.[0]).toBe(
      `/api/instances/${instanceId}`,
    );
    expect(lastInit(destroyMock).method).toBe("DELETE");
    expect(lastInit(destroyMock).body).toBeUndefined();
    expect(lastInit(destroyMock).headers).toEqual({
      "Idempotency-Key": "destroy:smoke:0001",
    });
  });

  it("projects stable BFF error codes", async () => {
    for (const [status, code] of [
      [401, "UNAUTHORIZED"],
      [403, "FORBIDDEN"],
      [404, "NOT_FOUND"],
      [409, "CONFLICT"],
      [429, "RATE_LIMITED"],
    ] as const) {
      stubFetch(jsonResponse({ code }, status));
      expect(await readInstance(instanceId)).toEqual({ ok: false, code });
    }
  });

  it("preserves the stable error code and diagnostic reference without echoing messages", async () => {
    stubFetch(
      jsonResponse(
        {
          code: "RATE_LIMITED",
          message: "Try again later.",
          correlationId: operationId,
        },
        429,
      ),
    );

    expect(await readInstance(instanceId)).toEqual({
      ok: false,
      code: "RATE_LIMITED",
      correlationId: operationId,
    });
  });

  it("fails closed on an unexpected status, shape, or content type", async () => {
    stubFetch(jsonResponse(pendingInstance, 201));
    expect(await readInstance(instanceId)).toEqual({
      ok: false,
      code: "MALFORMED",
    });

    stubFetch(jsonResponse({ ...pendingInstance, extra: true }, 200));
    expect(await readInstance(instanceId)).toEqual({
      ok: false,
      code: "MALFORMED",
    });

    stubFetch(
      new Response("not json", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      }),
    );
    expect(await readInstance(instanceId)).toEqual({
      ok: false,
      code: "MALFORMED",
    });
  });

  it("rejects a target URL that arrives before the instance is running", async () => {
    stubFetch(
      jsonResponse(
        { ...pendingInstance, url: "https://target.example.test" },
        200,
      ),
    );

    expect(await readInstance(instanceId)).toEqual({
      ok: false,
      code: "MALFORMED",
    });
  });

  it("reports an unreachable BFF instead of throwing", async () => {
    stubFetch(() => {
      throw new TypeError("Failed to fetch");
    });

    expect(await readInstance(instanceId)).toEqual({
      ok: false,
      code: "UNREACHABLE",
    });
  });
});

describe("instance presentation helpers", () => {
  it("reveals a target URL only while running", () => {
    expect(targetUrlFor(runningInstance)).toBe("https://target.example.test");
    expect(targetUrlFor(pendingInstance)).toBeNull();
    expect(
      targetUrlFor({ ...runningInstance, status: "stopping" }),
    ).toBeNull();
  });

  it("separates transitional from capacity-holding statuses", () => {
    const transitional: InstanceStatus[] = [
      "pending",
      "provisioning",
      "stopping",
    ];
    const settled: InstanceStatus[] = [
      "running",
      "stopped",
      "failed",
      "expired",
    ];
    const active: InstanceStatus[] = ["pending", "provisioning", "running"];
    const inactive: InstanceStatus[] = [
      "stopping",
      "stopped",
      "failed",
      "expired",
    ];

    expect(transitional.every(isTransitional)).toBe(true);
    expect(settled.some(isTransitional)).toBe(false);
    expect(active.every(isActive)).toBe(true);
    expect(inactive.some(isActive)).toBe(false);
  });

  it("does not render executable or credential-bearing target links", () => {
    for (const url of ["javascript:alert(1)", "ftp://target.example.test", "https://user:password@target.example.test", "not a url"]) {
      expect(targetUrlFor({ ...runningInstance, url })).toBeNull();
    }
  });

  it("counts down from an absolute expiry without going negative", () => {
    const expiry = Date.parse(pendingInstance.expiresAt);

    expect(remainingMs(pendingInstance, expiry - 90_000)).toBe(90_000);
    expect(remainingMs(pendingInstance, expiry + 5_000)).toBe(0);
    expect(formatCountdown(90_000)).toBe("01:30");
    expect(formatCountdown(0)).toBe("00:00");
    expect(formatCountdown(3_600_000)).toBe("1:00:00");
    expect(formatCountdown(3_725_000)).toBe("1:02:05");
  });

  it("accepts only a UUID challenge identifier", () => {
    expect(isChallengeId(challengeId)).toBe(true);
    expect(isChallengeId("not-a-uuid")).toBe(false);
    expect(isChallengeId("")).toBe(false);
  });
});
