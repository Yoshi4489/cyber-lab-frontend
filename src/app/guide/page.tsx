import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  FlaskConical,
  Sparkles,
  UserRound,
} from "lucide-react";
import { BackendStatus } from "@/features/backend/backend-status";
import { DemoControls } from "@/features/guide/demo-controls";
import styles from "@/features/guide/guide.module.css";
import { getFrontendMode } from "@/features/backend/frontend-mode";

export const metadata: Metadata = { title: "Demo guide" };
export default function GuidePage() {
  const preview = getFrontendMode() === "preview";
  return (
    <div className={styles.page}>
      <header>
        <p className="eyebrow">MAKE YOURSELF AT HOME</p>
        <h1>A little guidance goes a long way.</h1>
        <p>Everything you need to know about the CiscoKU Lab demo.</p>
      </header>
      <div className={styles.grid}>
        <section>
          <UserRound size={24} />
          <h2>Start with a username.</h2>
          <p>
            Browse freely as a guest. Choose a demo username to try a session
            and see your dashboard. This creates a local demo profile, not a
            real account. Returning with the same username keeps your progress;
            a different username starts fresh.
          </p>
        </section>
        <section>
          <FlaskConical size={24} />
          <h2>Try a simulated session.</h2>
          <p>
            {preview ? "The session page is a preview for now. Timers, start, stop, and Finish demo controls are coming in the next phase. No server or target is created." : "Live sessions use the backend account and instance controls. No demo username authorizes a real target."}
          </p>
        </section>
        <section>
          <Sparkles size={24} />
          <h2>Watch small wins add up.</h2>
          <p>
            Demo progress and rewards are illustrative; existing completions stay
            in this browser. Completion controls are coming in the next phase.
            Leaderboard classmates are fictional.
          </p>
        </section>
        <section>
          <Bookmark size={24} />
          <h2>Keep your next step close.</h2>
          <p>
            Bookmark a lab to find it again in Saved labs. Demo progress,
            bookmarks, and theme preferences stay in this browser. They do not
            sync to another device.
          </p>
        </section>
      </div>
      <section className={styles.panel} id="ground-rules">
        <h2>A friendly space for learning.</h2>
        <p>
          CiscoKU Lab is a free university learning project. This preview
          demonstrates the website experience; challenge content and real lab
          access are planned for a later phase. There are no payments. Real
          targets will require the platform’s security launch checks.
        </p>
        <Link href="/labs">
          Find a sample lab <ArrowRight size={15} />
        </Link>
      </section>
      <section className={styles.panel}>
        <DemoControls />
      </section>
      {!preview && <details className={styles.details}>
        <summary>Maintainer tools: optional backend connection check</summary>
        <p>
          This diagnostic checks API availability only. It does not start labs
          or enable real accounts.
        </p>
        <BackendStatus />
      </details>}
    </div>
  );
}
