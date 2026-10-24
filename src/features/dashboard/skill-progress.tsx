import { progressFor, type Learner } from "@/features/learner/model";
import styles from "./dashboard.module.css";

export function SkillProgress({ learner, now }: { learner: Learner; now: number }) {
  const { topics } = progressFor(learner, now);
  return (
    <section className={styles.panel} aria-label="Sample skill progress">
      <h2>A little stronger in every direction.</h2>
      <p>
        Explore each topic. These bars count demo completions, not skill
        assessments.
      </p>
      <div className={styles.skills}>
        {topics.map(({ category, completed, total }) => (
              <div key={category}>
                <span>{category}</span>
                <progress
                  aria-label={`${category} progress`}
                  value={completed}
                  max={total}
                />
                <small>
                  {completed} / {total}
                </small>
              </div>
        ))}
      </div>
    </section>
  );
}
