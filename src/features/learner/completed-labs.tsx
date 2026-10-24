import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { labs } from "@/features/catalog/data";
import type { LearnerProgress } from "./model";
import styles from "./progress.module.css";

export function CompletedLabs({ completed, limit }: { completed: LearnerProgress["completedLabs"]; limit?: number }) {
  const visible = limit ? completed.slice(0, limit) : completed;
  return <section className={styles.panel} aria-label="Completed demo labs">
    <div className={styles.heading}><h2>Completed demo labs</h2><span>{completed.length} / {labs.length}</span></div>
    {completed.length ? <>
      <p>Small wins, saved in this browser. Replaying a lab adds no extra XP.</p>
      <ul className={styles.completed}>
        {visible.map(lab => <li key={lab.slug}>
          <CheckCircle2 size={20} aria-hidden="true" />
          <div><Link href={`/labs/${lab.slug}`}>{lab.title}<ArrowRight size={14} aria-hidden="true" /></Link>
            <span>{lab.category} · <time dateTime={new Date(lab.completedAt).toISOString()}>{new Date(lab.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</time></span>
          </div>
          <strong>{lab.points} <small>demo XP</small></strong>
        </li>)}
      </ul>
      {limit && <Link className={styles.more} href="/profile">{visible.length < completed.length ? "View all completed labs" : "See your demo profile"} <ArrowRight size={14} /></Link>}
    </> : <>
      <p>No demo labs completed yet. Start a sample session and choose Finish demo to record your first small win.</p>
      <Button asChild variant="secondary"><Link href="/labs">Explore the sample labs <ArrowRight size={15} /></Link></Button>
    </>}
  </section>;
}
