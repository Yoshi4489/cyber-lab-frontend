"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  FlaskConical,
  Heart,
  Home,
  LogOut,
  Map,
  Trophy,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/features/auth/provider";
import { useLearner, leaveDemo } from "@/features/learner/store";
import { ApiError } from "@/features/backend/api-error";
import { Brand } from "./brand";
import styles from "./shell.module.css";

const navigation = [
  { href: "/", label: "Home", icon: Home, preview: false },
  { href: "/labs", label: "Labs", icon: FlaskConical, preview: false },
  { href: "/paths", label: "Learning paths", icon: Map, preview: true },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy, preview: false },
  { href: "/profile", label: "Profile", icon: UserRound, preview: true },
];
export function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, loading, error, refresh, signOut, mode } = useAuth();
  const { learner, ready } = useLearner();
  const [signingOut, setSigningOut] = useState(false);
  const user = mode === "preview"
    ? learner.signedIn && learner.username ? { displayName: learner.username, emailVerified: false } : null
    : session?.authenticated ? session.user : null;
  async function handleSignOut() {
    if (mode === "preview") {
      leaveDemo();
      onNavigate?.();
      router.push("/");
      return;
    }
    if (signingOut) return;
    setSigningOut(true);
    const result = await signOut();
    setSigningOut(false);
    if (result.ok) {
      onNavigate?.();
      router.push("/");
    }
  }
  return (
    <>
      <Brand onNavigate={onNavigate} />
      <div className={styles.workspace}>
        <span>YOUR LEARNING SPACE</span>
        <small>A little progress, every day.</small>
      </div>
      <nav aria-label="Main navigation" className={styles.nav}>
        {navigation.map(({ href, label, icon: Icon, preview }) => {
          const active =
            href === "/"
              ? pathname === "/" || pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={19} />
              <span>{label}</span>
              {preview && (href !== "/profile" || mode === "live") && <small>Preview</small>}
            </Link>
          );
        })}
      </nav>
      <div className={styles.bottom}>
        <div className={styles.community}>
          <Heart size={20} />
          <h2>Made for curious minds.</h2>
          <p>A free space to learn, make mistakes, and find your thing.</p>
          <Link href="/guide" onClick={onNavigate}>
            A little guidance <BookOpen size={14} />
          </Link>
        </div>
        <div className={styles.account}>
          <span className={styles.avatar}>
            {user
              ? user.displayName.slice(0, 2).toUpperCase()
              : "Hi"}
          </span>
          <div>
            <strong>
              {user ? user.displayName : "Hello, explorer"}
            </strong>
            <small>
              {mode === "preview" ? !ready ? "Getting your demo ready…" : user ? "Demo learner · this browser" : "Make yourself at home" : loading ? "Checking session…" : user
                ? user.emailVerified ? "Verified account" : "Email verification needed"
                : "Make yourself at home"}
            </small>
          </div>
          {user && (
            <button
              aria-label={signingOut ? "Signing out" : "Sign out"}
              disabled={signingOut || loading}
              onClick={() => void handleSignOut()}
            >
              <LogOut size={17} />
            </button>
          )}
        </div>
        {mode === "live" && <ApiError error={error} />}
        {mode === "live" && error && !user && (
          <button disabled={loading} onClick={() => void refresh()}>Retry session</button>
        )}
      </div>
    </>
  );
}
