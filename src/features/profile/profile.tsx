"use client";
import Link from "next/link";
import { ArrowRight, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLearner } from "@/features/learner/store";
import { progressFor } from "@/features/learner/model";
import { DemoNotice } from "@/features/learner/demo-notice";
import { CompletedLabs } from "@/features/learner/completed-labs";
import { Milestones } from "@/features/learner/milestones";
import { ProgressOverview } from "@/features/dashboard/progress-overview";
import { SkillProgress } from "@/features/dashboard/skill-progress";
import { useClock } from "@/hooks/use-clock";
import styles from "./profile.module.css";

export function Profile() {
  const { learner, ready } = useLearner();
  const now = useClock();
  if (!ready) return <p role="status">Getting your demo profile ready…</p>;
  if (!learner.signedIn || !learner.username) return <section className={styles.guest}>
    <UserRound size={36} aria-hidden="true" /><h1>Your demo profile starts here.</h1>
    <p>Choose a username to see your local sample progress, completed labs, and illustrative rewards.</p>
    <Button asChild><Link href="/login?next=%2Fprofile">Choose a demo username <ArrowRight size={16} /></Link></Button>
    <Link href="/labs">Explore the sample labs</Link>
  </section>;
  const progress = progressFor(learner, now);
  return <div className={styles.page}>
    <header className={styles.heading}>
      <div className={styles.identity}><span className={styles.avatar} aria-hidden="true">{learner.username.slice(0, 2).toUpperCase()}</span><div><h1>{learner.username}</h1><p>Your demo profile · read only</p></div></div>
      <Button asChild variant="secondary"><Link href="/dashboard">Go to dashboard <ArrowRight size={16} /></Link></Button>
    </header>
    <div className={styles.notice}><DemoNotice /><p>Sample progress and rewards are illustrative. This is not a real account or a skill assessment.</p></div>
    <ProgressOverview learner={learner} now={now} />
    <div className={styles.columns}>
      <div className={styles.main}><CompletedLabs completed={progress.completedLabs} /><SkillProgress learner={learner} now={now} /></div>
      <aside className={styles.rail}><Milestones badges={progress.badges} />
        <section className={styles.local}><h2>Your progress, close to home.</h2><p>It stays in this browser. Sign out to keep it for next time, or use the demo guide for a fresh start.</p><Link href="/guide">Demo guide and reset <ArrowRight size={14} /></Link><Link href="/leaderboard">See the fictional rankings <ArrowRight size={14} /></Link></section>
      </aside>
    </div>
  </div>;
}
