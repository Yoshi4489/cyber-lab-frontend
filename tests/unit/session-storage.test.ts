import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { completeMutation, forgetInstance, mutationKey, rememberedInstance, rememberInstance } from "../../src/features/session/storage";

const local = new Map<string, string>();
const session = new Map<string, string>();
function storage(values: Map<string, string>) {
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) };
}
beforeEach(() => { local.clear(); session.clear(); vi.stubGlobal("localStorage", storage(local)); vi.stubGlobal("sessionStorage", storage(session)); });
afterEach(() => vi.unstubAllGlobals());
describe("live session persistence", () => {
  it("stores only validated reference IDs and rejects malformed saved instances", () => {
    const instanceId = crypto.randomUUID(); const challengeId = crypto.randomUUID();
    expect(rememberInstance(instanceId, challengeId)).toBe(true);
    expect(rememberedInstance()).toEqual({ instanceId, challengeId });
    for (const invalid of ["{", JSON.stringify({ instanceId: "bad", challengeId }), JSON.stringify({ instanceId, challengeId, url: "https://untrusted.test" })]) {
      local.set("ciscoku:active-instance:v1", invalid); expect(rememberedInstance()).toBeNull();
    }
    forgetInstance(); expect(local.size).toBe(0);
  });
  it("keeps pending mutation keys through storage denial and releases them only after acceptance", () => {
    vi.stubGlobal("sessionStorage", { getItem() { throw new Error("Denied"); }, setItem() { throw new Error("Denied"); }, removeItem() { throw new Error("Denied"); } });
    const retained = new Map<string, string>(); const id = crypto.randomUUID();
    const original = mutationKey("create", id, retained);
    expect(mutationKey("create", id, retained)).toBe(original);
    expect(mutationKey("extend", id, retained)).not.toBe(original);
    completeMutation("create", id, retained);
    expect(mutationKey("create", id, retained)).not.toBe(original);
  });
  it("reuses a persisted retry key across page instances and replaces malformed keys", () => {
    const id = crypto.randomUUID(); const first = mutationKey("create", id, new Map());
    expect(mutationKey("create", id, new Map())).toBe(first);
    session.set(`ciscoku:mutation:create:${id}`, "invalid key");
    expect(mutationKey("create", id, new Map())).not.toBe("invalid key");
  });
  it("reports unavailable persistence without losing control of a same-tab operation", () => {
    vi.stubGlobal("localStorage", { getItem() { throw new Error("Denied"); }, setItem() { throw new Error("Denied"); }, removeItem() { throw new Error("Denied"); } });
    expect(rememberInstance(crypto.randomUUID(), crypto.randomUUID())).toBe(false);
    expect(rememberedInstance()).toBeNull(); expect(() => forgetInstance()).not.toThrow();
  });
});
