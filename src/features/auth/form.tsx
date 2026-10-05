"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/features/backend/api-error";
import type { ApiFailure } from "@/features/backend/client";
import { emailAction, login, safeDestination } from "./client";
import { useAuth } from "./provider";
import styles from "@/features/learner/learner.module.css";

type Mode = "login" | "verification-request" | "verification-confirm" | "reset-request" | "reset-confirm";
const headings: Record<Mode, string> = {
  login: "Welcome back.", "verification-request": "Verify your email.", "verification-confirm": "Confirm your email.",
  "reset-request": "Forgot your password?", "reset-confirm": "Choose a new password.",
};
export function AuthForm({ mode, token, destination }: { mode: Mode; token?: string; destination?: string }) {
  const router = useRouter();
  const { setSession, refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiFailure | null>(null);
  const [complete, setComplete] = useState(false);
  const needsEmail = mode === "login" || mode.endsWith("-request");
  const needsPassword = mode === "login" || mode === "reset-confirm";
  const invalidToken = mode.endsWith("-confirm") && !/^[A-Za-z0-9_-]{43}$/.test(token ?? "");
  return <div className={styles.onboarding}>
    <section className={styles.intro}><p className="eyebrow">YOUR LEARNING SPACE</p><h1>A little curiosity.<br />A lot of possibility.</h1><p>Sign in to your account to start a private lab and track your progress.</p><p>Public registration is currently closed.</p></section>
    <section className={styles.formPanel}>
      <h2>{headings[mode]}</h2>
      {invalidToken ? <p role="alert">This link is invalid. Request a new link.</p> : complete ? <p role="status">{mode.endsWith("-request") ? "If the account is eligible, a link has been sent." : mode === "verification-confirm" ? "Email verified. You can now return to your lab." : "Password updated. Sign in with your new password."}</p> :
      <form onSubmit={async event => {
        event.preventDefault();
        if (busy) return;
        const data = new FormData(event.currentTarget);
        setBusy(true); setError(null);
        const result = mode === "login"
          ? await login(String(data.get("email")), String(data.get("password")))
          : await emailAction(mode === "verification-request" ? "verification/request" : mode === "verification-confirm" ? "verification/confirm" : mode === "reset-request" ? "password-reset/request" : "password-reset/confirm",
            needsEmail ? { email: String(data.get("email")) } : mode === "reset-confirm" ? { token: token!, newPassword: String(data.get("password")) } : { token: token! });
        setBusy(false);
        if (!result.ok) { setError(result); return; }
        if (mode === "login" && result.value && "authenticated" in result.value) {
          setSession(result.value);
          router.replace(safeDestination(destination));
        } else {
          setComplete(true);
          if (mode === "verification-confirm" || mode === "reset-confirm") await refresh();
        }
      }}>
        {needsEmail && <><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" maxLength={320} required /></>}
        {needsPassword && <><label htmlFor="password">{mode === "reset-confirm" ? "New password" : "Password"}</label><input id="password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={12} maxLength={1024} required /></>}
        <ApiError error={error} />
        <Button className="full-width" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : mode.endsWith("-request") ? "Send link" : "Confirm"}</Button>
      </form>}
      {mode === "login" && <><Link href="/forgot-password">Forgot password?</Link><br /><Link href="/verify-email">Resend verification email</Link></>}
      <p><Link href={mode === "login" ? "/labs" : "/login"}>{mode === "login" ? "Browse labs as a guest" : "Back to sign in"}</Link></p>
    </section>
  </div>;
}
