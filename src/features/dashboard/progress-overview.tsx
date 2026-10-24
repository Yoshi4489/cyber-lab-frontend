import { Award, CheckCircle2, Flame, Zap } from "lucide-react";
import {
  progressFor,
  XP_PER_LEVEL,
  type Learner,
} from "@/features/learner/model";
import styles from "./progress-overview.module.css";

export function ProgressOverview({
  learner,
  now,
}: {
  learner: Learner;
  now: number;
}) {
  const { xp, level, streak, completedCount, totalLabs, earnedBadges } = progressFor(learner, now);
  const metrics = [
    {
      label: "Demo XP earned",
      value: xp,
      icon: Zap,
      note: `Level ${level} · keep exploring`,
    },
    {
      label: "Labs completed",
      value: completedCount,
      icon: CheckCircle2,
      note: `Out of ${totalLabs} sample labs`,
    },
    {
      label: "Learning streak",
      value: `${streak} ${streak === 1 ? "day" : "days"}`,
      icon: Flame,
      note: "One small step each day",
    },
    {
      label: "Badges unlocked",
      value: earnedBadges,
      icon: Award,
      note: "Celebrate your milestones",
    },
  ];
  return (
    <section className={styles.metrics} aria-label="Demo learning progress">
      {metrics.map(({ label, value, icon: Icon, note }) => (
        <div className={styles.metric} key={label}>
          <div>
            <span>{label}</span>
            <Icon size={18} />
          </div>
          <strong>{value}</strong>
          <p>{note}</p>
        </div>
      ))}
      <div className={styles.level}>
        <span>Level {level}</span>
        <progress
          aria-label="Progress to next level"
          value={xp % XP_PER_LEVEL}
          max={XP_PER_LEVEL}
        />
        <span>
          {xp % XP_PER_LEVEL} / {XP_PER_LEVEL} XP to next level
        </span>
      </div>
    </section>
  );
}
