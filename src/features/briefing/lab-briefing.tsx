import Link from "next/link";
import { ArrowLeft, FlaskConical, Zap } from "lucide-react";
import type { LiveLab } from "@/features/catalog/live";
import { LabArt } from "@/features/catalog/lab-art";
import { DifficultyBadge } from "@/features/catalog/lab-card";
import { SaveButton } from "@/features/bookmarks/save-button";
import { StartLab } from "@/features/session/start-lab";
import styles from "./briefing.module.css";
export function LabBriefing({ lab }: { lab: LiveLab }) {
  return <div>
    <Link href="/labs" className={styles.back}><ArrowLeft size={15} />Back to all labs</Link>
    <header className={styles.heading}><div>
      <p className="eyebrow">{lab.category.toUpperCase()} · PUBLISHED LAB BRIEFING</p>
      <h1>{lab.title}<span className="accent">.</span></h1><p>{lab.summary}</p>
      <div className={styles.meta}><DifficultyBadge difficulty={lab.difficulty} /><span><Zap size={15} />{lab.points} points</span></div>
    </div><SaveButton slug={lab.slug} title={lab.title} showLabel /></header>
    <div className={styles.layout}>
      <div className={styles.content}><LabArt lab={lab} large /><section className={styles.section}>
        <p className="eyebrow">YOUR STARTING POINT</p><h2>A little context before you begin.</h2><p>{lab.summary}</p>
      </section></div>
      <aside className={styles.aside}>
        <section className={styles.launch}><span className={styles.icon}><FlaskConical size={27} /></span>
          <span className={styles.label}>PRIVATE LAB</span><h2>Ready to give it a try?</h2>
          <p>Start your own instance. Submit a flag from a running lab to record a solve.</p>
          {lab.kind === "web" ? <StartLab slug={lab.slug} /> : <p>Shell lab access is not available in the current HTTP lifecycle.</p>}
          <small>One active instance per account. Initial lifetime: 60 minutes.</small>
          <p className={styles.once}>Only the first correct solve awards points.</p>
        </section>
        <section className={styles.skills}><h2>Skills in focus</h2><div>{lab.tags.map(tag => <span key={tag}>{tag}</span>)}</div></section>
      </aside>
    </div>
  </div>;
}
