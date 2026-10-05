"use client";
import Link from "next/link";
import { ArrowLeft, Clock3, FlaskConical } from "lucide-react";
import type { LiveLab } from "@/features/catalog/live";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/features/backend/api-error";
import { useAuth } from "@/features/auth/provider";
import { formatCountdown, isActive, remainingMs, targetUrlFor } from "@/features/instances/client";
import { useClock } from "@/hooks/use-clock";
import { useInstance } from "./use-instance";
import { StartLab } from "./start-lab";
import styles from "./session.module.css";
export function SessionPanel({ lab }: { lab: LiveLab }) {
  const { session, loading, error: authError, refresh } = useAuth();
  const { instance, error, restoring, busy, storageWarning, mutate, retry } = useInstance(lab.id);
  const now = useClock();
  const targetUrl = instance ? targetUrlFor(instance) : null;
  const matches = instance?.challengeId === lab.id;
  return <div className={styles.page}>
    <Link href={`/labs/${lab.slug}`} className={styles.back}><ArrowLeft size={15} />Back to briefing</Link>
    <header><p className="eyebrow">YOUR PRIVATE LAB SESSION</p><h1>{lab.title}</h1><p>Live backend session · the shell’s demo label does not apply to this panel. Instance state and lifetime are controlled by the backend.</p></header>
    <section className={styles.panel} aria-label="Lab session">
      <div className={styles.top}><span className={styles.icon}><FlaskConical size={26} /></span>
        <span className={styles.status} data-testid="lab-status">{instance?.status ?? "Not started"}</span></div>
      {loading || (session?.authenticated && restoring) ? <p role="status">Checking your lab session…</p> :
        authError ? <><ApiError error={authError} /><Button onClick={() => void refresh()}>Retry session</Button></> :
        !session?.authenticated ? <StartLab slug={lab.slug} /> :
        <>
          <ApiError error={error} />
          {error && <Button variant="ghost" disabled={Boolean(busy)} onClick={retry}>Retry instance status</Button>}
          {storageWarning && <p role="alert">This browser cannot remember the instance after leaving this page. Keep this session open.</p>}
          {instance && <><div className={styles.timer}><Clock3 size={22} /><div><span>Time remaining</span><strong role="timer">{formatCountdown(remainingMs(instance, now))}</strong></div></div>
            <dl className={styles.details}><div><dt>Instance</dt><dd>{instance.id}</dd></div><div><dt>Access</dt><dd>{targetUrl ? <a data-testid="lab-target" href={targetUrl} target="_blank" rel="noopener noreferrer">Open target</a> : instance.status === "running" ? "Target address is not configured." : "Target address appears when running."}</dd></div></dl>
            {!matches && <p>You already have an instance for another challenge. Stop it before starting this lab.</p>}
            {instance.status === "failed" && <p role="alert">The backend could not prepare this lab. Try again or contact the operator.</p>}
          </>}
          {(!instance || (!isActive(instance.status) && instance.status !== "stopping")) && lab.kind === "web" &&
            (session.user.emailVerified ? <Button className="full-width" disabled={Boolean(busy) || Boolean(error && error.code !== "NOT_FOUND")} onClick={() => void mutate("create")}>{busy === "create" ? "Starting…" : "Start Lab"}</Button> : <StartLab slug={lab.slug} />)}
          {lab.kind !== "web" && !instance && <p>Shell lab access is not available in the current HTTP lifecycle.</p>}
          {instance && isActive(instance.status) && <div className={styles.finish}>
            <Button disabled={Boolean(busy) || Date.parse(instance.expiresAt) >= Date.parse(instance.absoluteExpiresAt)} onClick={() => void mutate("extend")}>{busy === "extend" ? "Extending…" : "Extend 30 minutes"}</Button>
            <Button variant="ghost" disabled={Boolean(busy)} onClick={() => void mutate("destroy")}>{busy === "destroy" ? "Stopping…" : "Stop Lab"}</Button>
          </div>}
          {instance?.status === "stopping" && <p role="status">Stopping the lab…</p>}
        </>}
    </section>
  </div>;
}
