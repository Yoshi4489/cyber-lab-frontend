import Link from "next/link";
import { ArrowUpRight, Clock3, Zap } from "lucide-react";
import type { Lab } from "./data";
import type { LiveLab } from "./live";
import { LabArt } from "./lab-art";
import { SaveButton } from "@/features/bookmarks/save-button";
import styles from "./catalog.module.css";

export function DifficultyBadge({
  difficulty,
}: {
  difficulty: Lab["difficulty"];
}) {
  return (
    <span
      className={styles.difficulty}
      data-difficulty={difficulty.toLowerCase()}
    >
      <span aria-hidden="true">●</span>
      {difficulty}
    </span>
  );
}

export function LabCard({ lab }: { lab: Lab | LiveLab }) {
  return (
    <article className={styles.card} data-testid="lab-card">
      <Link href={`/labs/${lab.slug}`} tabIndex={-1} aria-hidden="true">
        <LabArt lab={lab} />
      </Link>
      <div className={styles.cardBody}>
        <div className={styles.meta}>
          <span>{lab.category}</span>
          <DifficultyBadge difficulty={lab.difficulty} />
        </div>
        <h3>
          <Link href={`/labs/${lab.slug}`}>
            {lab.title}
            <ArrowUpRight size={17} />
          </Link>
        </h3>
        <p>{lab.description}</p>
        <div className={styles.cardFooter}>
          {"minutes" in lab && <span><Clock3 size={14} />{lab.minutes} min</span>}
          <span>
            <Zap size={14} />
            {lab.points} {"id" in lab ? "points" : "demo XP"}
          </span>
          <SaveButton slug={lab.slug} title={lab.title} />
        </div>
      </div>
    </article>
  );
}
