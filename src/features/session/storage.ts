import { z } from "zod";
import { isValidIdempotencyKey, newIdempotencyKey, type InstanceOperation } from "@/features/instances/client";
const instanceKey = "ciscoku:active-instance:v1";
const savedSchema = z.object({ instanceId: z.uuid(), challengeId: z.uuid() }).strict();
export function rememberedInstance() {
  try { const parsed = savedSchema.safeParse(JSON.parse(localStorage.getItem(instanceKey) ?? "null")); return parsed.success ? parsed.data : null; }
  catch { return null; }
}
export function rememberInstance(instanceId: string, challengeId: string): boolean {
  try { localStorage.setItem(instanceKey, JSON.stringify({ instanceId, challengeId })); return true; } catch { return false; }
}
export function forgetInstance() { try { localStorage.removeItem(instanceKey); } catch { /* Optional persistence. */ } }
export function mutationKey(operation: InstanceOperation, id: string, retained: Map<string, string>): string {
  const storageKey = `ciscoku:mutation:${operation}:${id}`;
  const existing = retained.get(storageKey);
  if (existing) return existing;
  let saved: string | null = null;
  try { saved = sessionStorage.getItem(storageKey); } catch { /* Use in-memory retry keys. */ }
  const key = saved && isValidIdempotencyKey(saved) ? saved : newIdempotencyKey(operation);
  retained.set(storageKey, key);
  try { sessionStorage.setItem(storageKey, key); } catch { /* Use in-memory retry keys. */ }
  return key;
}
export function completeMutation(operation: InstanceOperation, id: string, retained: Map<string, string>) {
  const storageKey = `ciscoku:mutation:${operation}:${id}`;
  retained.delete(storageKey);
  try { sessionStorage.removeItem(storageKey); } catch { /* Optional persistence. */ }
}
