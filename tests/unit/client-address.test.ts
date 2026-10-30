import { afterEach, describe, expect, it, vi } from "vitest";
import { learnerAddress } from "../../src/features/backend/client-address";

const request = (headers: Record<string, string>) =>
  new Request("https://lab.ciscoku.test/api/auth/login", { headers });

afterEach(() => vi.unstubAllEnvs());

describe("learner address for backend rate limits", () => {
  it("trusts no header unless the deployment names one", () => {
    vi.stubEnv("TRUSTED_CLIENT_IP_HEADER", "");
    expect(learnerAddress(request({ "X-Forwarded-For": "203.0.113.7", "X-Real-IP": "203.0.113.8" }))).toBeUndefined();
    vi.stubEnv("TRUSTED_CLIENT_IP_HEADER", "not a header!");
    expect(learnerAddress(request({ "X-Forwarded-For": "203.0.113.7" }))).toBeUndefined();
  });

  it("reads only the configured header and its rightmost entry", () => {
    vi.stubEnv("TRUSTED_CLIENT_IP_HEADER", "X-Real-IP");
    expect(learnerAddress(request({ "X-Real-IP": "203.0.113.8", "X-Forwarded-For": "9.9.9.9" }))).toBe("203.0.113.8");
    expect(learnerAddress(request({ "X-Forwarded-For": "9.9.9.9" }))).toBeUndefined();
    vi.stubEnv("TRUSTED_CLIENT_IP_HEADER", "x-forwarded-for");
    expect(learnerAddress(request({ "X-Forwarded-For": "1.1.1.1, 203.0.113.7" }))).toBe("203.0.113.7");
    expect(learnerAddress(request({ "X-Forwarded-For": " 2001:db8::5 " }))).toBe("2001:db8::5");
    expect(learnerAddress(request({ "X-Forwarded-For": "::ffff:198.51.100.4" }))).toBe("198.51.100.4");
  });

  it("rejects malformed configured values", () => {
    vi.stubEnv("TRUSTED_CLIENT_IP_HEADER", "x-forwarded-for");
    for (const value of ["", "unknown", "203.0.113.7:443", "999.1.1.1", "1.1.1.1, not-an-ip"]) {
      expect(learnerAddress(request({ "X-Forwarded-For": value }))).toBeUndefined();
    }
  });
});
