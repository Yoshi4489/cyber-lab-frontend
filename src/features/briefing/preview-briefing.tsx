import Link from "next/link";
import { ArrowLeft, FlaskConical, Zap, Clock3 } from "lucide-react";
import type { Lab } from "@/features/catalog/data";
import { LabArt } from "@/features/catalog/lab-art";
import { DifficultyBadge } from "@/features/catalog/lab-card";
import { SaveButton } from "@/features/bookmarks/save-button";
import { StartLab } from "@/features/session/start-lab";
import styles from "./briefing.module.css";

export function PreviewBriefing({ lab }: { lab: Lab }) {
  return <div>
    <Link href="/labs" className={styles.back}><ArrowLeft size={15} />Back to all labs</Link>
    <header className={styles.heading}><div>
      <h1>{lab.title}<span className="accent">.</span></h1><p>{lab.description}</p>
      <div className={styles.meta}><DifficultyBadge difficulty={lab.difficulty} /><span><Clock3 size={15} />{lab.minutes} min</span><span><Zap size={15} />{lab.points} demo XP</span></div>
    </div><SaveButton slug={lab.slug} title={lab.title} showLabel /></header>
    <div className={styles.layout}>
      <div className={styles.content}>
        <LabArt lab={lab} large />
        <section className={styles.section}><h2>A little context before you begin.</h2><p>{lab.story}</p></section>
        <section className={styles.section}><h2>What you’ll explore</h2><ul>{lab.objectives.map(objective => <li key={objective}>{objective}</li>)}</ul></section>
        <section className={styles.section}><h2>Before you begin</h2>{lab.prerequisites.map(item => <p key={item}>{item}</p>)}</section>
      </div>
      <aside className={styles.aside}>
        <section className={styles.launch}><span className={styles.icon}><FlaskConical size={27} /></span>
          <span className={styles.label}>DEMO LAB · SAMPLE CONTENT</span><h2>Let curiosity lead the way.</h2>
          <p>Explore this sample briefing and preview the session space. Simulated session controls are coming in the next phase.</p>
          <StartLab slug={lab.slug} />
          <small>No real target, account, or flag is created.</small>
          <p className={styles.once}>XP is illustrative. Completion controls are not available yet.</p>
        </section>
        <section className={styles.skills}><h2>Skills in focus</h2><div>{lab.tags.map(tag => <span key={tag}>{tag}</span>)}</div></section>
      </aside>
    </div>
  </div>;
}
