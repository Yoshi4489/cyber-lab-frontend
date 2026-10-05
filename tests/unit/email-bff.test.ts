import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ operation: vi.fn() }));
vi.mock("../../src/features/backend/auth-adapter", () => ({ authEmailOperation: mocks.operation }));
import { emailRoute } from "../../src/features/backend/email-bff";

beforeEach(() => { vi.clearAllMocks(); mocks.operation.mockResolvedValue({ accepted: true }); });
function request(body: object, origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/auth/verification/request", {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}
describe("email BFF", () => {
  it("acknowledges requests without exposing account state", async () => {
    const response = await emailRoute("verification/request")(request({ email: "learner@example.test" }));
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ accepted: true });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("rejects foreign origins and unexpected identity fields before contacting the backend", async () => {
    expect((await emailRoute("verification/request")(request({ email: "learner@example.test" }, "https://attacker.test"))).status).toBe(403);
    expect((await emailRoute("verification/request")(request({ email: "learner@example.test", userId: "chosen-user" }))).status).toBe(400);
    expect(mocks.operation).not.toHaveBeenCalled();
  });
  it("rejects malformed tokens and weak new passwords", async () => {
    expect((await emailRoute("verification/confirm")(request({ token: "bad" }))).status).toBe(400);
    expect((await emailRoute("password-reset/confirm")(request({ token: "A".repeat(43), newPassword: "short" }))).status).toBe(400);
    expect(mocks.operation).not.toHaveBeenCalled();
  });
});
