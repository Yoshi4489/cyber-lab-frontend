"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/provider";
import { ApiError } from "@/features/backend/api-error";
import type { ApiFailure } from "@/features/backend/client";
import { useResource } from "@/features/backend/use-resource";
import { readLeaderboard, readProfile } from "./client";
import styles from "./progress.module.css";

const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });
const formatDate = (value: string) => dateFormat.format(new Date(value));

/** Persisted account progress; nothing is filled in from local demo state. */
export function LiveProfile() {
  const { session, loading: authLoading, error: authError, refresh, sessionEpoch } = useAuth();
  const authenticated = !authLoading && session?.authenticated === true;
  return <div className={styles.page}>
    <header><p className="eyebrow">YOUR PROGRESS</p><h1>{authenticated ? session.user.displayName : "Your profile"}</h1><p>Points and solves recorded for your account.</p></header>
    {authLoading ? <p role="status">Checking your account…</p>
      : authError ? <><ApiError error={authError} /><Button onClick={() => void refresh()}>Retry session</Button></>
      : !authenticated ? <SignInPrompt next="/profile" />
      : <ProfileBody key={sessionEpoch} />}
  </div>;
}

function ProfileBody() {
  const { value: profile, error, loading, retry } = useResource(readProfile);
  if (loading) return <p role="status">Loading your progress…</p>;
  if (error || !profile) return <ReadFailure error={error} retry={retry} />;
  return <>
    <section className={styles.stats} aria-label="Totals">
      <div className={styles.stat}><span>Total points</span><strong data-testid="profile-points">{profile.totalPoints}</strong></div>
      <div className={styles.stat}><span>Labs solved</span><strong data-testid="profile-solved">{profile.solvedCount} <small>of {profile.availableChallenges}</small></strong></div>
    </section>
    <section className={styles.panel}>
      <h2>Solve history</h2>
      {profile.solves.length === 0
        ? <p className={styles.empty}>No solves yet. <Link href="/labs">Start with Welcome</Link> and submit the flag shown on your page.</p>
        : <div className={styles.scroll}><table>
          <caption className="sr-only">Your solved labs</caption>
          <thead><tr><th scope="col">Lab</th><th scope="col">Points</th><th scope="col">Solved</th></tr></thead>
          <tbody>{profile.solves.map(solve => <tr key={solve.challengeId}>
            <th scope="row"><Link href={`/labs/${encodeURIComponent(solve.slug)}`}>{solve.title}</Link></th>
            <td>{solve.points}</td><td>{formatDate(solve.solvedAt)}</td>
          </tr>)}</tbody>
        </table></div>}
    </section>
  </>;
}

/** Public rankings returned by the backend; no fictional learners are added. */
export function LiveLeaderboard() {
  const { value: board, error, loading, retry } = useResource(readLeaderboard);
  return <div className={styles.page}>
    <header><p className="eyebrow">RANKINGS</p><h1>Leaderboard</h1><p>Ranked by points, then solves, then who got there first.</p></header>
    {loading ? <p role="status">Loading rankings…</p>
      : error || !board ? <ReadFailure error={error} retry={retry} />
      : <section className={styles.panel}>
        {board.entries.length === 0 ? <p className={styles.empty}>No one has solved a lab yet. Be the first.</p>
          : <div className={styles.scroll}><table>
            <caption className="sr-only">Leaderboard ranked by points</caption>
            <thead><tr><th scope="col">Rank</th><th scope="col">Learner</th><th scope="col">Points</th><th scope="col">Solved</th><th scope="col">Last solve</th></tr></thead>
            <tbody>{board.entries.map(entry => <tr key={`${entry.rank}:${entry.displayName}`}>
              <td>#{entry.rank}</td><th scope="row">{entry.displayName}</th><td>{entry.totalPoints}</td><td>{entry.solvedCount}</td>
              <td>{entry.lastSolvedAt ? formatDate(entry.lastSolvedAt) : "—"}</td>
            </tr>)}</tbody>
          </table></div>}
      </section>}
  </div>;
}

/** Compact persisted totals for the signed-in home page. */
export function LiveProgressSummary() {
  const { session, loading, sessionEpoch } = useAuth();
  if (loading || !session?.authenticated) return null;
  return <SummaryBody key={sessionEpoch} />;
}

function SummaryBody() {
  const { value: profile, error, loading } = useResource(readProfile);
  if (loading) return <p role="status" className={styles.summary}>Loading your progress…</p>;
  if (error || !profile) return <p className={styles.summary}>Your progress is unavailable right now. <Link href="/profile">Open your profile</Link></p>;
  return <p className={styles.summary} data-testid="home-progress">
    <span><strong>{profile.totalPoints}</strong> points</span>
    <span><strong>{profile.solvedCount}</strong> of {profile.availableChallenges} labs solved</span>
    <Link href="/profile">View your profile <ArrowRight size={14} /></Link>
  </p>;
}

function SignInPrompt({ next }: { next: string }) {
  return <section className={styles.panel}><p>Sign in to see your progress.</p>
    <Button asChild><Link href={`/login?next=${encodeURIComponent(next)}`}>Sign in <ArrowRight size={16} /></Link></Button></section>;
}

function ReadFailure({ error, retry }: { error: ApiFailure | null; retry: () => void }) {
  return <section className={styles.panel}>
    {error ? <ApiError error={error} /> : <p role="alert">This information is unavailable right now.</p>}
    {error?.code === "UNAUTHORIZED" ? <SignInPrompt next="/profile" /> : <Button variant="secondary" onClick={retry}>Retry</Button>}
  </section>;
}
