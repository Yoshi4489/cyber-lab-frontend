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

export const metadata: Metadata = { title: "Lab guide" };
export default function GuidePage() {
  const preview = getFrontendMode() === "preview";
  if (!preview) return <div className={styles.page}>
    <header><h1>A little guidance goes a long way.</h1><p>Get to know your account and the harmless Welcome introduction.</p></header>
    <div className={styles.grid}>
      <section><UserRound size={24} /><h2>Use your operator-provided account.</h2><p>Sign in with your email and password. Your real account stays with you as you browse and refresh. Public registration is closed.</p></section>
      <section><FlaskConical size={24} /><h2>Begin with Welcome.</h2><p>Read the Welcome briefing in Labs. Choose Spawn Instance, then confirm the launch in your session. Preparation takes a moment; Open Welcome page appears only when it is running. This is a harmless introduction with no puzzle, hidden step, or vulnerability.</p></section>
      <section><Sparkles size={24} /><h2>A simple practice flow.</h2><p>Your assigned Welcome page openly displays a flag. Submission and account progress are being prepared. The session begins with 60 minutes; extensions add 30 minutes up to two hours from the original start. Stop the instance when you finish.</p></section>
      <section><Bookmark size={24} /><h2>Keep your place.</h2><p>Save Welcome to find it again in Saved labs. Bookmarks and theme stay in this browser. Signing out ends your account session while keeping those preferences.</p></section>
    </div>
    <section className={styles.panel} id="ground-rules"><h2>A friendly space for learning.</h2><p>Welcome helps you practice the basic lab flow. Use only your assigned page. Other learners’ sessions and unrelated systems are outside this introduction.</p><Link href="/labs">Explore published labs <ArrowRight size={15} /></Link></section>
    <details className={styles.details}><summary>Maintainer tools: optional backend connection check</summary><p>This checks API availability only. It does not start a target.</p><BackendStatus /></details>
  </div>;
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
            {preview ? "Start demo moves through simulated preparation to a running timer. You can extend by 30 minutes, up to two hours from the original start, or stop at any time. The original expiry survives refresh. No server or target is created." : "Live sessions use the backend account and instance controls. No demo username authorizes a real target."}
          </p>
        </section>
        <section>
          <Sparkles size={24} />
          <h2>Watch small wins add up.</h2>
          <p>
            Finish demo simulates a successful solve and records illustrative XP
            once per sample lab. Replays award no extra XP. Progress stays in this
            browser. {preview ? "Dashboard and the read-only demo Profile show the same totals, completed labs, and illustrative milestones. " : "Dashboard progress remains a separate local demo. "}
            Classmates in the rankings are fictional. Equal XP shares a rank.
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
