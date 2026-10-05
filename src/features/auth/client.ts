"use client";
import { z } from "zod";
import { requestBff } from "@/features/backend/client";

export const sessionSchema = z.discriminatedUnion("authenticated", [
  z.object({ authenticated: z.literal(false) }).strict(),
  z.object({ authenticated: z.literal(true), user: z.object({ displayName: z.string(), emailVerified: z.boolean() }).strict() }).strict(),
]);
export type BrowserSession = z.infer<typeof sessionSchema>;
export function readSession(signal?: AbortSignal) {
  return requestBff("/api/auth/session", sessionSchema, 200, { signal });
}
export function login(email: string, password: string) {
  return requestBff("/api/auth/login", sessionSchema, 200, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }),
  });
}
export function logout() {
  return requestBff("/api/auth/logout", z.undefined(), 204, { method: "POST" });
}
export type EmailAction = "verification/request" | "verification/confirm" | "password-reset/request" | "password-reset/confirm";
export function emailAction(action: EmailAction, input: { email: string } | { token: string; newPassword?: string }) {
  const status = action.endsWith("/request") ? 202 : 204;
  return requestBff(`/api/auth/${action}`, status === 202 ? z.object({ accepted: z.literal(true) }).strict() : z.undefined(), status, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
  });
}
export function safeDestination(value?: string): string {
  return value && /^\/(?:labs(?:\/[a-z0-9-]+(?:\/session)?)?|dashboard|profile)?$/.test(value) ? value : "/labs";
}
