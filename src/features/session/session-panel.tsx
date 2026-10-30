"use client";
import Link from "next/link";
import { ArrowLeft, Clock3, FlaskConical } from "lucide-react";
import { isWelcome, type LiveLab } from "@/features/catalog/live";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/features/backend/api-error";
import { useAuth } from "@/features/auth/provider";
import { formatCountdown, isActive, remainingMs, targetUrlFor } from "@/features/instances/client";
import { useClock } from "@/hooks/use-clock";
import { FlagForm } from "@/features/progress/flag-form";
import { useInstance } from "./use-instance";
import { StartLab } from "./start-lab";
import styles from "./session.module.css";
export function SessionPanel({ lab }: { lab: LiveLab }) {
  const { sessionEpoch } = useAuth();
  return <LiveSession key={`${sessionEpoch}:${lab.id}`} lab={lab} />;
}
function LiveSession({ lab }: { lab: LiveLab }) {
  const { session, loading, error: authError, refresh } = useAuth();
  const { instance, error, restoring, busy, storageWarning, mutate, retry, retryAt } = useInstance(lab.id);
  const now = useClock();
  const welcome = isWelcome(lab);
  const matches = instance?.challengeId === lab.id;
  const timeLeft = instance && (isActive(instance.status) || instance.status === "stopping") ? remainingMs(instance, now) : 0;
  const targetUrl = instance && matches && timeLeft > 0 ? targetUrlFor(instance) : null;
  const coolingDown = now < retryAt;
  const message = !instance ? "Start an instance to prepare your own page."
    : isActive(instance.status) && timeLeft === 0 ? "Time is up. Waiting for the server to confirm expiry."
    : instance.status === "pending" ? "Your instance is queued. Waiting for preparation to begin."
    : instance.status === "provisioning" ? "Preparing your page. Its link will appear when it is ready."
    : instance.status === "running" ? "Your page is ready. Open it in a new tab and keep this session for its timer and controls."
    : instance.status === "stopping" ? "Stopping your instance. Its page is no longer available."
    : instance.status === "expired" ? "Your instance has expired. You can prepare a new one when you are ready."
    : instance.status === "stopped" ? "Your instance has stopped. You can prepare a new one when you are ready." : null;
  return <div className={styles.page}>
    <Link href={`/labs/${lab.slug}`} className={styles.back}><ArrowLeft size={15} />Back to briefing</Link>
    <header><p className="eyebrow">YOUR PRIVATE LAB SESSION</p><h1>{lab.title}</h1><p>Prepare your own page and open it when it is ready. Use only the page assigned to this session. Your instance expires automatically.</p></header>
    <section className={styles.panel} aria-label="Lab session">
      <div className={styles.top}><span className={styles.icon}><FlaskConical size={26} /></span>
        <span className={styles.status} data-testid="lab-status" role="status">{instance?.status ?? "Not started"}</span></div>
      {loading || (session?.authenticated && restoring) ? <p role="status">Checking your lab session…</p> :
        authError ? <><ApiError error={authError} /><Button onClick={() => void refresh()}>Retry session</Button></> :
        !session?.authenticated ? <StartLab slug={lab.slug} label={welcome ? "Spawn Instance" : "Start Lab"} /> :
        <>
          {message && <p role="status">{message}</p>}
          <ApiError error={error} />
          {error && <Button variant="ghost" disabled={Boolean(busy) || coolingDown} onClick={retry}>Retry instance status</Button>}
          {coolingDown && <p role="status">Please wait before trying again. Controls will become available automatically.</p>}
          {storageWarning && <p role="alert">This browser cannot remember the instance after leaving this page. Keep this session open.</p>}
          {instance && <><div className={styles.timer}><Clock3 size={22} /><div><span>Time remaining</span><strong role="timer">{formatCountdown(timeLeft)}</strong></div></div>
            <dl className={styles.details}><div><dt>Instance</dt><dd>{instance.id}</dd></div><div><dt>Access</dt><dd>{targetUrl ? <a data-testid="lab-target" href={targetUrl} target="_blank" rel="noopener noreferrer">{welcome ? "Open Welcome page" : "Open target"}</a> : !matches ? "This instance belongs to another lab." : !isActive(instance.status) && instance.status !== "stopping" ? "This page is no longer available." : timeLeft === 0 ? "This session has no time remaining." : instance.status === "running" ? "The page address is not available yet." : "The page link appears when running."}</dd></div></dl>
            {!matches && <p>You already have an instance for another challenge. Stop it before starting this lab.</p>}
            {instance.status === "failed" && <p role="alert">{instance.failureCode === "node_capacity_exhausted" ? "There is no free space for this instance right now. Try again later." : "We could not prepare this page. Try again or contact your operator."}</p>}
          </>}
          {(!instance || (!isActive(instance.status) && instance.status !== "stopping")) && lab.kind === "web" &&
            (session.user.emailVerified ? <Button className="full-width" disabled={Boolean(busy) || coolingDown || Boolean(error && error.code !== "NOT_FOUND")} onClick={() => void mutate("create")}>{busy === "create" ? "Starting…" : welcome ? "Spawn Instance" : "Start Lab"}</Button> : <StartLab slug={lab.slug} />)}
          {lab.kind !== "web" && !instance && <p>Shell lab access is not available in the current HTTP lifecycle.</p>}
          {instance && isActive(instance.status) && <div className={styles.controls}>
            <Button disabled={Boolean(busy) || coolingDown || !matches || instance.status !== "running" || timeLeft === 0 || Date.parse(instance.expiresAt) >= Date.parse(instance.absoluteExpiresAt)} onClick={() => void mutate("extend")}>{busy === "extend" ? "Extending…" : "Extend 30 minutes"}</Button>
            <Button variant="ghost" disabled={Boolean(busy) || coolingDown} onClick={() => void mutate("destroy")}>{busy === "destroy" ? "Stopping…" : "Stop Lab"}</Button>
          </div>}
          {instance && matches && isActive(instance.status) && <FlagForm key={instance.id} challengeId={lab.id} instanceId={instance.id} enabled={instance.status === "running" && timeLeft > 0} />}
        </>}
    </section>
  </div>;
}
