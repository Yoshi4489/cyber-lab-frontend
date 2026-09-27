import { afterEach, describe, expect, it } from "vitest";
import {
  assertSameOriginMutation,
  CsrfConfigurationError,
  CsrfValidationError,
} from "../../src/features/backend/csrf";

const requestUrl = "https://lab.ciscoku.test/api/auth/login";
const originalPublicOrigin = process.env.BFF_PUBLIC_ORIGIN;
const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  restore("BFF_PUBLIC_ORIGIN", originalPublicOrigin);
  restore("NODE_ENV", originalNodeEnv);
});

describe("BFF mutation origin validation", () => {
  it("allows an explicit same-origin browser mutation", () => {
    const request = new Request(requestUrl, {
      method: "POST",
      headers: {
        Origin: "https://lab.ciscoku.test",
        "Sec-Fetch-Site": "same-origin",
      },
    });

    expect(() => assertSameOriginMutation(request)).not.toThrow();
  });

  it("uses the configured browser-facing origin behind an internal server URL", () => {
    process.env.BFF_PUBLIC_ORIGIN = "https://lab.ciscoku.test";
    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        Origin: "https://lab.ciscoku.test",
        "Sec-Fetch-Site": "same-origin",
      },
    });

    expect(() => assertSameOriginMutation(request)).not.toThrow();
  });

  it("fails closed when the production public origin is missing or insecure", () => {
    restore("NODE_ENV", "production");
    delete process.env.BFF_PUBLIC_ORIGIN;
    const request = new Request(requestUrl, {
      method: "POST",
      headers: { Origin: "https://lab.ciscoku.test" },
    });

    expect(() => assertSameOriginMutation(request)).toThrow(CsrfConfigurationError);

    process.env.BFF_PUBLIC_ORIGIN = "http://lab.ciscoku.test";
    expect(() => assertSameOriginMutation(request)).toThrow(CsrfConfigurationError);
  });

  const rejectedRequests = [
    ["a request with no Origin header", {}],
    ["an opaque origin", { Origin: "null" }],
    ["a different origin", { Origin: "https://attacker.test" }],
    [
      "cross-site fetch metadata",
      { Origin: "https://lab.ciscoku.test", "Sec-Fetch-Site": "cross-site" },
    ],
    [
      "same-site but cross-origin fetch metadata",
      { Origin: "https://lab.ciscoku.test", "Sec-Fetch-Site": "same-site" },
    ],
  ] satisfies [string, HeadersInit][];

  it.each(rejectedRequests)("rejects %s", (_description, headers) => {
    const request = new Request(requestUrl, { method: "POST", headers });

    expect(() => assertSameOriginMutation(request)).toThrow(CsrfValidationError);
  });
});

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
