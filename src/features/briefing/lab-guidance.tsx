"use client";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/features/backend/api-error";
import { playerChallengeStateSchema, type ChallengeContent, type PlayerChallengeState } from "@/features/backend/catalog-schemas";
import { requestBff, type ApiFailure } from "@/features/backend/client";
import { useResource } from "@/features/backend/use-resource";
import { useAuth } from "@/features/auth/provider";
import { Markdown } from "./markdown";
import styles from "./briefing.module.css";

export function LabGuidance({ slug, content }: { slug: string; content: ChallengeContent }) {
  const { session } = useAuth();
  const signedIn = Boolean(session?.authenticated);
  const base = `/api/challenges/${encodeURIComponent(slug)}`;
  const load = useCallback((signal?: AbortSignal) => requestBff(`${base}/state`, playerChallengeStateSchema, 200, { signal }), [base]);
  const resource = useResource(load, signedIn);
  const [latest, setLatest] = useState<PlayerChallengeState | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [confirming, setConfirming] = useState(false);
  const state = latest ?? resource.value;
  if (content.hints.length === 0 && !content.hasWalkthrough) return null;

  async function unlock(path: string) {
    setBusy(true); setFailure(null);
    const result = await requestBff(`${base}/${path}/unlock`, playerChallengeStateSchema, 200, { method: "POST" });
    setBusy(false); setConfirming(false);
    if (result.ok) setLatest(result.value); else setFailure(result);
  }

  return <section className={styles.section} aria-label="Hints and walkthrough">
    <p className="eyebrow">STUCK?</p><h2>Hints and walkthrough.</h2>
    {state?.solved && <p role="status">{state.pointsAwarded ? `Solved for ${state.pointsAwarded} points.` : "Solved, with no points awarded."} Hints and the walkthrough are now free.</p>}
    {state && !state.solved && state.forfeited && <p role="status">You opened the walkthrough, so this lab no longer awards points. A solve is still recorded.</p>}
    {state && !state.solved && !state.forfeited && state.costApplied > 0 && <p role="status">Hints have reduced this lab&apos;s award by {state.costApplied} points.</p>}
    {!signedIn && <p>Sign in to use hints and the walkthrough.</p>}
    <ApiError error={resource.error} /><ApiError error={failure} />
    {content.hints.map(({ position, cost }) => {
      const unlocked = state?.unlockedHints.find(hint => hint.position === position);
      return <div key={position} className={styles.hint}>
        <h3>Hint {position}</h3>
        {unlocked ? <Markdown source={unlocked.bodyMd} />
          : <Button variant="ghost" disabled={!state || busy} onClick={() => void unlock(`hints/${position}`)}>{state?.solved ? "Reveal hint" : `Reveal hint (costs ${cost} points)`}</Button>}
      </div>;
    })}
    {content.hasWalkthrough && <div className={styles.hint}>
      <h3>Walkthrough</h3>
      {state?.walkthroughMd ? <Markdown source={state.walkthroughMd} />
        : confirming ? <><p role="alert">Opening the walkthrough before you solve this lab forfeits all of its points. This cannot be undone.</p>
          <div className={styles.confirm}><Button disabled={busy} onClick={() => void unlock("walkthrough")}>Forfeit points and open</Button><Button variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>Keep trying</Button></div></>
        : <Button variant="ghost" disabled={!state || busy} onClick={() => setConfirming(true)}>Open walkthrough</Button>}
    </div>}
  </section>;
}
