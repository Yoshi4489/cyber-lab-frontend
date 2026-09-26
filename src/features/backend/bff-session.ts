import "server-only";
import { cookies } from "next/headers";
import {
  BackendSessionCookieError,
  sealBackendSession,
  unsealBackendSession,
  type BackendSessionCookiePayload,
} from "./session-cookie";

export const BACKEND_SESSION_COOKIE = "ciscoku.backend-session";

/**
 * These helpers mutate cookies and must only run inside a Route Handler or
 * Server Function. They are intentionally not usable by browser code.
 */
export async function setBackendSessionCookie(
  session: BackendSessionCookiePayload,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: BACKEND_SESSION_COOKIE,
    value: await sealBackendSession(session),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    priority: "high",
    expires: new Date(session.absoluteExpiresAt),
  });
}

export async function readBackendSessionCookie(): Promise<BackendSessionCookiePayload | null> {
  const cookieStore = await cookies();
  const sealedSession = cookieStore.get(BACKEND_SESSION_COOKIE)?.value;
  if (!sealedSession) return null;

  try {
    return await unsealBackendSession(sealedSession);
  } catch (error) {
    if (!(error instanceof BackendSessionCookieError)) throw error;
    cookieStore.delete(BACKEND_SESSION_COOKIE);
    return null;
  }
}

export async function clearBackendSessionCookie(): Promise<void> {
  (await cookies()).delete(BACKEND_SESSION_COOKIE);
}
