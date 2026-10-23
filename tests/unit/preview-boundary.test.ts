import { afterEach, describe, expect, it, vi } from "vitest";
import { getFrontendMode } from "../../src/features/backend/frontend-mode";
import { previewCatalog, previewLabs } from "../../src/features/catalog/preview";
import { safeDestination } from "../../src/features/auth/client";
import { sealBackendSession } from "../../src/features/backend/session-cookie";
import { proxy } from "../../src/proxy";

const sensitive = vi.hoisted(() => ({ cookies: vi.fn(), request: vi.fn(), token: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: sensitive.cookies }));
vi.mock("../../src/features/backend/transport", async importOriginal => ({
  ...await importOriginal<typeof import("../../src/features/backend/transport")>(),
  requestBackendJson: sensitive.request,
}));
vi.mock("../../src/features/backend/service-token", async importOriginal => ({
  ...await importOriginal<typeof import("../../src/features/backend/service-token")>(),
  issueBackendServiceToken: sensitive.token,
}));

import { GET as catalog } from "../../src/app/api/catalog/route";
import { GET as status } from "../../src/app/api/backend-status/route";
import { POST as login } from "../../src/app/api/auth/login/route";
import { POST as logout } from "../../src/app/api/auth/logout/route";
import { GET as session } from "../../src/app/api/auth/session/route";
import { POST as verificationRequest } from "../../src/app/api/auth/verification/request/route";
import { POST as verificationConfirm } from "../../src/app/api/auth/verification/confirm/route";
import { POST as resetRequest } from "../../src/app/api/auth/password-reset/request/route";
import { POST as resetConfirm } from "../../src/app/api/auth/password-reset/confirm/route";
import { POST as create } from "../../src/app/api/instances/route";
import { GET as get, DELETE as destroy } from "../../src/app/api/instances/[id]/route";
import { POST as extend } from "../../src/app/api/instances/[id]/extend/route";
import { POST as submit } from "../../src/app/api/submissions/route";

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });

describe("deployment-owned preview boundary", () => {
  it.each([undefined, "preview", "LIVE", "", "invalid"])("fails closed for mode %s before auth, cookies, body or upstream work", async mode => {
    vi.stubEnv("FRONTEND_MODE", mode);
    vi.stubEnv("BACKEND_URL", "http://127.0.0.1:4199");
    vi.stubEnv("BFF_AUTH_SECRET", "test-only-bff-authentication-secret-value");
    vi.stubEnv("BFF_SESSION_SECRET", "test-only-frontend-session-secret-value");
    vi.stubEnv("BACKEND_SERVICE_TOKEN_SECRET", "test-only-service-token-secret-value");
    const fetch = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected network access"));
    const cookie = await sealBackendSession({ sessionToken: "A".repeat(43), absoluteExpiresAt: new Date(Date.now() + 3_600_000).toISOString() });
    const request = new Request("http://127.0.0.1:3100/api/instances?FRONTEND_MODE=live", {
      method: "POST", headers: { Cookie: `ciscoku.backend-session=${cookie}`, "Content-Type": "application/json" },
      body: JSON.stringify({ FRONTEND_MODE: "live" }),
    });
    const context = { params: Promise.resolve({ id: "7850ac98-88b2-4d2f-953d-3f2d5b204205" }) };
    const responses = await Promise.all([
      catalog(), status(), login(request), logout(request), session(),
      verificationRequest(request), verificationConfirm(request), resetRequest(request), resetConfirm(request),
      create(request), get(request, context), destroy(request, context), extend(request, context), submit(request),
    ]);
    for (const response of responses) {
      expect(response.status).toBe(404);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("set-cookie")).toBeNull();
      expect(await response.json()).toEqual({ code: "NOT_FOUND" });
    }
    expect(request.bodyUsed).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
    for (const spy of Object.values(sensitive)) expect(spy).not.toHaveBeenCalled();
    expect(getFrontendMode()).toBe("preview");
    vi.stubEnv("LIVE_INSTANCE_UI", "true");
    expect(proxy().status).toBe(404);
  });

  it("allows only explicit live configuration", () => {
    vi.stubEnv("FRONTEND_MODE", "live");
    expect(getFrontendMode()).toBe("live");
    vi.stubEnv("LIVE_INSTANCE_UI", "true");
    expect(proxy().headers.get("x-middleware-next")).toBe("1");
    vi.stubEnv("LIVE_INSTANCE_UI", "false");
    expect(proxy().status).toBe(404);
  });

  it("validates twelve generated-contract samples while retaining separate editorial metadata", () => {
    expect(previewCatalog.origin).toBe("preview");
    expect(previewCatalog.response.source).toBe("database");
    expect(previewCatalog.response.challenges).toHaveLength(12);
    expect(new Set(previewCatalog.response.challenges.map(lab => lab.id)).size).toBe(12);
    expect(previewLabs).toHaveLength(12);
    for (const lab of previewCatalog.response.challenges) {
      expect(lab).not.toHaveProperty("minutes");
      expect(lab).not.toHaveProperty("story");
      expect(lab).not.toHaveProperty("origin");
      expect(previewLabs.find(item => item.slug === lab.slug)?.title).toBe(lab.title);
    }
  });

  it.each(["https://attacker.test", "//attacker.test", "/\\attacker.test", "/api/instances", "/labs?mode=live"])("rejects unsafe onboarding destination %s", destination => {
    expect(safeDestination(destination)).toBe("/labs");
  });
});
