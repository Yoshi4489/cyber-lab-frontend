import Link from "next/link";
import { ArrowLeft, FlaskConical, Zap } from "lucide-react";
import { isWelcome, type LiveLab } from "@/features/catalog/live";
import { LabArt } from "@/features/catalog/lab-art";
import { DifficultyBadge } from "@/features/catalog/lab-card";
import { SaveButton } from "@/features/bookmarks/save-button";
import { StartLab } from "@/features/session/start-lab";
import styles from "./briefing.module.css";
import { ArtifactPanel } from "./artifact-panel";
import { LabGuidance } from "./lab-guidance";
import { Markdown } from "./markdown";
import { WelcomeInstructions } from "./welcome-instructions";
import type { ChallengeContent } from "@/features/backend/catalog-schemas";
export function LabBriefing({ lab, content }: { lab: LiveLab; content: ChallengeContent }) {
  const welcome = isWelcome(lab);
  return <div>
    <Link href="/labs" className={styles.back}><ArrowLeft size={15} />Back to all labs</Link>
    <header className={styles.heading}><div>
      <p className="eyebrow">{lab.category.toUpperCase()} · PUBLISHED LAB BRIEFING</p>
      <h1>{lab.title}<span className="accent">.</span></h1><p>{lab.summary}</p>
      <div className={styles.meta}><DifficultyBadge difficulty={lab.difficulty} /><span><Zap size={15} />{lab.points} points</span></div>
    </div><SaveButton slug={lab.slug} title={lab.title} showLabel /></header>
    <div className={styles.layout}>
      <div className={styles.content}><LabArt lab={lab} large /><section className={styles.section}>
        <p className="eyebrow">YOUR STARTING POINT</p><h2>A little context before you begin.</h2>{content.briefingMd ? <div className={styles.briefing}><Markdown source={content.briefingMd} /></div> : <p>{lab.summary}</p>}
      </section>{welcome && <WelcomeInstructions />}
      {content.objectives.length > 0 && <section className={styles.section}><p className="eyebrow">OBJECTIVES</p><h2>What to do.</h2><ol>{content.objectives.map(item => <li key={item}>{item}</li>)}</ol></section>}
      {lab.kind === "artifact" ? <ArtifactPanel slug={lab.slug} challengeId={lab.id} content={content} /> : <LabGuidance slug={lab.slug} content={content} />}
      {content.learningOutcomes.length > 0 && <section className={styles.section}><p className="eyebrow">LEARNING OUTCOMES</p><h2>What you will take away.</h2><ul>{content.learningOutcomes.map(item => <li key={item}>{item}</li>)}</ul></section>}
      {content.references.length > 0 && <section className={styles.section}><p className="eyebrow">REFERENCES</p><h2>Read further.</h2><ul>{content.references.map(({ label, url }) => <li key={label}>{url?.startsWith("https://") ? <a href={url} target="_blank" rel="noopener noreferrer">{label}</a> : label}</li>)}</ul></section>}
      </div>
      <aside className={styles.aside}>
        <section className={styles.launch}><span className={styles.icon}><FlaskConical size={27} /></span>
          <span className={styles.label}>{lab.kind === "artifact" ? "DOWNLOAD CHALLENGE" : "PRIVATE LAB"}</span><h2>Ready to give it a try?</h2>
          <p>{welcome ? "Get to know your learning workspace with a simple Welcome page." : lab.kind === "artifact" ? "Nothing to start: download the files below, work on them with your own tools, and submit the flag you find." : "Start your own instance. Submit a flag from a running lab to record a solve."}</p>
          {lab.kind === "web" ? <StartLab slug={lab.slug} label={welcome ? "Spawn Instance" : "Start Lab"} /> : lab.kind === "shell" ? <p>Shell lab access is not available in the current HTTP lifecycle.</p> : null}
          {lab.kind !== "artifact" && <small>One active instance per account. Initial lifetime: 60 minutes.</small>}
          <p className={styles.once}>Only the first correct solve awards points.</p>
        </section>
        <section className={styles.skills}><h2>Skills in focus</h2><div>{lab.tags.map(tag => <span key={tag}>{tag}</span>)}</div></section>
      </aside>
    </div>
  </div>;
}
