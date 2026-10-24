"use client";
import Link from "next/link";
import { ArrowRight, Crown, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLearner } from "@/features/learner/store";
import { rankings } from "./rankings";
import styles from "./leaderboard.module.css";
import { DemoNotice } from "@/features/learner/demo-notice";

export function Leaderboard() {
  const { learner, ready } = useLearner();
  const entries = rankings(learner);
  if (!ready) return <p role="status">Getting the demo rankings ready…</p>;
  return (
    <div className={styles.page}>
      <header>
        <p className="eyebrow">GROW TOGETHER</p>
        <h1>A little friendly competition.</h1>
        <p>
          Every small step counts. Celebrate curiosity, consistency, and each
          other.
        </p>
      </header>
      <div className={styles.notice}>
        <Trophy size={17} />
        <span>
          Sample rankings · fictional learners and demo XP. This is not a live
          university leaderboard.
        </span>
      </div>
      <section className={styles.podium} aria-label="Top demo learners">
        {entries.slice(0, 3).map((entry) => (
          <article
            key={entry.id}
            className={entry.rank === 1 ? styles.first : styles.podiumCard}
          >
            <span className={styles.rank}>
              <Crown size={17} /> #{entry.rank}
            </span>
            <span className={styles.avatar}>
              {entry.name.slice(0, 2).toUpperCase()}
            </span>
            <h2>
              {entry.name}
              {entry.current ? " (you)" : ""}
            </h2>
            <p>
              Level {entry.level} · {entry.completed} labs
            </p>
            <strong>
              {entry.xp.toLocaleString("en-US")} <small>demo XP</small>
            </strong>
          </article>
        ))}
      </section>
      <section className={styles.tablePanel}>
        <div className={styles.tableHeading}>
          <h2>The curious community</h2>
          <span>Demo · All time</span>
        </div>
        <div className={styles.scroll}>
          <table>
            <caption className="sr-only">
              Fictional global leaderboard ranked by demo XP
            </caption>
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Learner</th>
                <th scope="col">Level</th>
                <th scope="col">Completed labs</th>
                <th scope="col">Demo XP</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className={entry.current ? styles.current : ""}
                >
                  <td>#{entry.rank}</td>
                  <th scope="row">
                    <span className={styles.smallAvatar}>
                      {entry.name.slice(0, 2).toUpperCase()}
                    </span>
                    {entry.name}
                    {entry.current && <span className={styles.you}>You</span>}
                  </th>
                  <td>{entry.level}</td>
                  <td>{entry.completed}</td>
                  <td>{entry.xp.toLocaleString("en-US")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.footnote}>
          Equal XP shares a rank. Your demo progress is saved only in this
          browser.
        </p>
      </section>
      {learner.signedIn && <p className={styles.profileLink}><Link href="/profile">See your demo profile <ArrowRight size={15} /></Link></p>}
      <div className={styles.localNotice}><DemoNotice /></div>
      {ready && !learner.signedIn && (
        <section className={styles.invite}>
          <div>
            <h2>There is room for you here.</h2>
            <p>Choose a username and try your first demo session.</p>
          </div>
          <Button asChild>
            <Link href="/signup">
              Join the demo <ArrowRight size={16} />
            </Link>
          </Button>
        </section>
      )}
    </div>
  );
}
