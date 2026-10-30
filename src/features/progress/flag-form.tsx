"use client";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/features/backend/api-error";
import type { ApiFailure } from "@/features/backend/client";
import { isUnknownSubmissionOutcome, maxFlagLength, submitFlag, type FlagSubmission } from "./client";
import styles from "./progress.module.css";

/**
 * Flag input stays in component state only: never in URLs, storage, logs or
 * messages. The parent keys this form by session and instance, so changing
 * either (including sign-out) discards any typed value.
 */
export function FlagForm({ challengeId, instanceId, enabled, onSolved }: { challengeId: string; instanceId: string; enabled: boolean; onSolved?: () => void }) {
  const [flag, setFlag] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<FlagSubmission | null>(null);
  const [error, setError] = useState<ApiFailure | null>(null);
  const inFlight = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || inFlight.current || flag.trim().length === 0) return;
    inFlight.current = true;
    setSending(true); setResult(null); setError(null);
    // One deliberate attempt. An unknown outcome is never retried here.
    const response = await submitFlag({ challengeId, instanceId, flag });
    inFlight.current = false;
    setSending(false);
    if (response.ok) {
      setResult(response.value);
      if (response.value.correct) { setFlag(""); onSolved?.(); }
    } else {
      setError(response);
    }
  }

  return <form className={styles.flagForm} onSubmit={event => void submit(event)} aria-label="Submit flag" autoComplete="off">
    <label htmlFor="lab-flag">Flag</label>
    <div className={styles.flagRow}>
      <Input id="lab-flag" name="flag" value={flag} onChange={event => { setFlag(event.target.value); setResult(null); }}
        maxLength={maxFlagLength} autoComplete="off" spellCheck={false} autoCapitalize="off" autoCorrect="off"
        disabled={!enabled || sending} placeholder="Paste your flag" aria-describedby="lab-flag-help" />
      <Button type="submit" disabled={!enabled || sending || flag.trim().length === 0}>{sending ? "Checking…" : "Submit flag"}</Button>
    </div>
    <p id="lab-flag-help" className={styles.help}>{enabled ? "Enter the flag you recovered from your page. Surrounding spaces are ignored; letters must match exactly." : "Flag submission is available while your instance is running."}</p>
    {result && <p role="status" data-testid="flag-result" className={result.correct ? styles.correct : styles.incorrect}>
      {!result.correct ? "That flag is not correct. Check it and try again."
        : result.points > 0 ? `Correct! You earned ${result.points} points.`
        : "Correct. No points were added, because you already solved this lab or opened its walkthrough first."}
    </p>}
    {error && (isUnknownSubmissionOutcome(error.code)
      ? <p role="alert">We could not confirm this attempt. It may have been recorded. <Link href="/profile">Check your progress</Link> before trying again.</p>
      : <ApiError error={error} />)}
  </form>;
}
