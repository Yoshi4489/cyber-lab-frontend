"use client";
import Link from "next/link";
import { ArrowLeft, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLearner } from "@/features/learner/store";
import type { Lab } from "@/features/catalog/data";
import styles from "./session.module.css";

export function PreviewSession({ lab }: { lab: Lab }) {
  const { learner, ready } = useLearner();
  return <div className={styles.page}>
    <Link href={`/labs/${lab.slug}`} className={styles.back}><ArrowLeft size={15} />Back to briefing</Link>
    <header><h1>{lab.title}</h1><p>Demo session · sample content</p></header>
    <section className={styles.panel} aria-label="Demo session">
      <FlaskConical size={28} />
      <h2>Your session space is taking shape.</h2>
      <p>This preview is fully simulated. The timer, session controls, and Finish demo action will arrive in the next phase. No target is running and no XP has been awarded.</p>
      {!ready ? <p role="status">Getting your demo ready…</p> : !learner.signedIn ?
        <Button asChild><Link href={`/login?next=${encodeURIComponent(`/labs/${lab.slug}/session`)}`}>Choose a demo username</Link></Button> :
        <p>Welcome, {learner.username}. You can keep exploring the sample labs while session controls are being prepared.</p>}
      <p><Link href="/labs">Explore the sample labs →</Link></p>
    </section>
  </div>;
}
