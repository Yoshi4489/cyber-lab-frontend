"use client";
import Link from "next/link";
import { ArrowLeft, Check, Clock3, FlaskConical, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Lab } from "@/features/catalog/data";
import { previewCatalog } from "@/features/catalog/preview";
import { formatCountdown, remainingMs } from "@/features/instances/client";
import { DemoNotice } from "@/features/learner/demo-notice";
import { usePreviewSession } from "./use-preview-session";
import styles from "./session.module.css";

export function PreviewSession({ lab }: { lab: Lab }) {
  const challenge = previewCatalog.response.challenges.find(item => item.slug === lab.slug)!;
  const { learner, ready, now, busy, error, mutate } = usePreviewSession(challenge.id);
  const active = learner.activeSession;
  const last = learner.lastSession?.instance.challengeId === challenge.id ? learner.lastSession : null;
  const matches = active?.instance.challengeId === challenge.id;
  const record = active ?? last;
  const instance = record?.instance;
  const completed = last?.completion;
  const activeLab = active && previewCatalog.response.challenges.find(item => item.id === active.instance.challengeId);
  const running = matches && instance?.status === "running";
  const atCap = instance && instance.expiresAt === instance.absoluteExpiresAt;
  return <div className={styles.page}>
    <Link href={`/labs/${lab.slug}`} className={styles.back}><ArrowLeft size={15} />Back to briefing</Link>
    <header><h1>{lab.title}</h1><p>Demo session · sample content. No target, flag, or real account is created.</p></header>
    <section className={styles.panel} aria-label="Demo session">
      <div className={styles.top}><span className={styles.icon}><FlaskConical size={26} /></span>
        <span className={styles.status} role="status" aria-label="Demo status" data-testid="demo-status">{instance?.status ?? "Not started"}</span></div>
      {!ready ? <p role="status">Getting your demo ready…</p> : !learner.signedIn ? <>
        <h2>Make this space your own.</h2><p>Choose a demo username to try the simulated controls. No password is needed.</p>
        <Button asChild><Link href={`/login?next=${encodeURIComponent(`/labs/${lab.slug}/session`)}`}>Choose a demo username</Link></Button>
      </> : <>
        {error && <p role="alert">{error.code === "CONFLICT" ? "Your demo session changed. Check its current status and try again." : error.code === "UNAUTHORIZED" ? "Your demo sign-in changed. Start again with the current username." : "That demo session is no longer active. Start a new one."}</p>}
        {active && !matches ? <>
          <h2>One discovery at a time.</h2><p>You have an active demo for {activeLab?.title}. Return to it, or stop it before starting this lab.</p>
          <Button asChild><Link href={`/labs/${activeLab?.slug}/session`}>Return to active demo</Link></Button>
        </> : <>
          <h2>{completed ? "A small win, worth celebrating." : instance?.status === "expired" ? "Time for a fresh start." : instance?.status === "stopped" ? "Your demo is stopped." : instance?.status === "pending" || instance?.status === "provisioning" ? "Preparing your demo workspace." : running ? "Your demo is ready to explore." : instance?.status === "stopping" ? "Closing your demo workspace." : "Ready to give it a try?"}</h2>
          <p>{completed ? "Demo complete. This records illustrative progress in this browser only." : instance?.status === "expired" ? "The saved expiry has passed. This demo is closed and can be started again." : running ? "Try the session controls below. Finish demo simulates a successful solve without entering or sending a flag." : "Start a simulated workspace to explore the timer and session controls. There is no real challenge to attack in this preview."}</p>
        </>}
        {active && <div className={styles.timer}><Clock3 size={22} /><div><span>Demo time remaining</span><strong role="timer">{formatCountdown(remainingMs(active.instance, now))}</strong></div></div>}
        {active && <p className={styles.notice}>Starts with 60 minutes. Each extension adds 30 minutes, up to 2 hours from the original start.</p>}
        {completed && !active && <div className={styles.reward} role="status"><Check size={32} /><div><strong>+{completed.points}</strong><small>demo XP {completed.points === 0 ? "· already earned for this lab" : "· first completion"}</small></div></div>}
        {active ? active.instance.status === "stopping" ? <p role="status">Stopping the demo…</p> : <div className={styles.finish}>
          {running && <Button className="full-width" disabled={busy} onClick={() => void mutate("finish")}><Check size={16} />Finish demo</Button>}
          <div className={styles.controls}>
            <Button variant="secondary" disabled={busy || active.instance.status !== "running" || Boolean(atCap)} onClick={() => void mutate("extend")}>Extend 30 minutes</Button>
            <Button variant="ghost" disabled={busy} onClick={() => void mutate("destroy")}>Stop demo</Button>
          </div>
          {atCap && <p>You have reached this demo’s two-hour limit.</p>}
        </div> : <>
          {learner.completions[lab.slug] !== undefined && <p className={styles.replay}><RotateCcw size={16} />You have already earned this lab’s demo XP. Replays add no extra XP.</p>}
          <Button className="full-width" disabled={busy} onClick={() => void mutate("create")}>{learner.completions[lab.slug] !== undefined ? "Replay demo" : "Start demo"}</Button>
        </>}
        {completed && !active && <p><Link href="/dashboard">View your dashboard →</Link></p>}
        <p><Link href="/labs">Explore the sample labs →</Link></p>
      </>}
      <div className={styles.notice}><DemoNotice /></div>
    </section>
  </div>;
}
