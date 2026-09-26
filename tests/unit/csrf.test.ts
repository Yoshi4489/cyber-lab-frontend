import { describe, expect, it } from "vitest";
import {
  assertSameOriginMutation,
  CsrfValidationError,
} from "../../src/features/backend/csrf";

const requestUrl = "https://lab.ciscoku.test/api/auth/login";

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
