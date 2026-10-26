"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ChevronRight, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useAuth } from "@/features/auth/provider";
import { useLearner } from "@/features/learner/store";
import { ThemeToggle } from "@/features/theme/theme-toggle";
import { Navigation } from "./navigation";
import styles from "./shell.module.css";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { session, loading, mode } = useAuth();
  const { learner, ready } = useLearner();
  const signedOut = mode === "preview" ? ready && !learner.signedIn : !loading && session?.authenticated === false;
  const [open, setOpen] = useState(false);
  const section = pathname.startsWith("/labs")
    ? "Labs"
    : pathname.startsWith("/paths")
      ? "Learning paths"
      : pathname === "/leaderboard"
        ? "Leaderboard"
        : pathname === "/profile"
          ? "Profile"
          : pathname === "/signup"
            ? "Welcome"
            : pathname === "/guide"
              ? "Field guide"
              : pathname === "/saved"
                ? "Saved labs"
                : "Home";
  return (
    <div className={styles.shell}>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <aside className={styles.sidebar}>
        <Navigation />
      </aside>
      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}>
            <div className={styles.menu}>
              <Sheet
                open={open}
                onOpenChange={setOpen}
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Open navigation"
                  >
                    <Menu size={21} />
                  </Button>
                }
              >
                <Navigation onNavigate={() => setOpen(false)} />
              </Sheet>
            </div>
            <span>Learning workspace</span>
            <ChevronRight size={13} />
            <strong>{section}</strong>
          </div>
          <div className={styles.tools}>
            <span className={styles.demo}>
              <span />
              {mode === "preview" ? "Demo workspace" : "Learning workspace"}
            </span>
            <ThemeToggle />
            {signedOut && (
              <Button asChild size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
            )}
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className={styles.content}>
          {children}
        </main>
        <footer className={styles.footer}>
          <span>
            CiscoKU Lab <span>·</span> Learn a little. Grow a lot.
          </span>
          <Link href="/guide">{mode === "preview" ? "Demo guide & information ↗" : "Lab guide & information ↗"}</Link>
        </footer>
      </div>
    </div>
  );
}
