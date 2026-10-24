import { Award } from "lucide-react";
import type { LearnerProgress } from "./model";
import styles from "./progress.module.css";

export function Milestones({ badges }: { badges: LearnerProgress["badges"] }) {
  return <section className={styles.panel} aria-label="Demo milestones">
    <div className={styles.heading}><h2>Your milestones</h2><Award size={19} aria-hidden="true" /></div>
    <p>Illustrative rewards for your sample completions.</p>
    <div className={styles.badges}>
      {badges.map(badge => <div key={badge.name} className={badge.earned ? styles.earned : undefined}>
        <span><Award size={22} aria-hidden="true" /></span>
        <div><strong>{badge.name}</strong><small>{badge.description}</small><small>{badge.earned ? "Unlocked" : "Not yet unlocked"}</small></div>
      </div>)}
    </div>
  </section>;
}
