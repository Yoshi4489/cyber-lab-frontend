"use client";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  FlaskConical,
  Sparkles,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CatalogRecommendations } from "@/features/catalog/recommendations";
import { progressFor } from "@/features/learner/model";
import { CompletedLabs } from "@/features/learner/completed-labs";
import { Milestones } from "@/features/learner/milestones";
import { DemoNotice } from "@/features/learner/demo-notice";
import { useLearner } from "@/features/learner/store";
import { useClock } from "@/hooks/use-clock";
import { LearningArt } from "./learning-art";
import { ProgressOverview } from "./progress-overview";
import { SkillProgress } from "./skill-progress";
import styles from "./dashboard.module.css";
import { useAuth } from "@/features/auth/provider";

export function Dashboard() {
  const { mode } = useAuth();
  const { learner, ready } = useLearner();
  const now = useClock();
  if (!ready) return <p role="status">Getting your demo ready…</p>;
  if (!learner.signedIn)
    return (
      <section className={styles.guest}>
        <FlaskConical size={36} />
        <h1>Your next chapter starts here.</h1>
        <p>Choose a demo username to explore your learning dashboard.</p>
        <Button asChild>
          <Link href="/signup">
            Join the demo <ArrowRight size={16} />
          </Link>
        </Button>
        <Link href="/labs">{mode === "preview" ? "Or browse the sample labs →" : "Or browse the published labs →"}</Link>
      </section>
    );
  const progress = progressFor(learner, now);
  const { today } = progress;
  return (
    <div className={styles.dashboard}>
      <header className={styles.heading}>
        <div>
          <p className="eyebrow">YOUR LEARNING SPACE</p>
          <h1>
            Hey, {learner.username}
            <span className="accent">.</span>
          </h1>
          <p>A little practice today. A little more confidence tomorrow.</p>
        </div>
        <span className={styles.label}>
          <Sparkles size={14} /> Let’s keep growing
        </span>
      </header>
      <ProgressOverview learner={learner} now={now} />
      <div className={styles.columns}>
        <div className={styles.mainColumn}>
          <section className={styles.recommendation}>
            <div className={styles.recommendCopy}>
              <span className={styles.kicker}>
                <Sparkles size={14} /> YOUR NEXT SMALL WIN
              </span>
              <h2>Your next discovery awaits.</h2>
              <p>{mode === "preview" ? "Explore 12 sample labs and find a topic that sparks your curiosity. Try a simulated session and finish the demo to record sample progress." : "Browse the published catalog. Live lab sessions require a backend account; this dashboard’s progress is still a separate demo."}</p>
              <Button asChild>
                <Link href="/labs">Explore labs <ArrowRight size={16} /></Link>
              </Button>
            </div>
            <LearningArt />
          </section>
          <SkillProgress learner={learner} now={now} />
          <CompletedLabs completed={progress.completedLabs} limit={3} />
          <section className={styles.explore}>
            <div className={styles.sectionHeading}>
              <div>
                <h2>Follow your curiosity</h2>
                <p>There is more than one way to find your thing.</p>
              </div>
              <Link href="/labs">
                All labs <ArrowRight size={15} />
              </Link>
            </div>
            <div className={styles.miniGrid}>
              <CatalogRecommendations />
            </div>
          </section>
        </div>
        <aside className={styles.rail}>
          <section className={styles.panel}>
            <span className={styles.panelIcon}>
              <Target size={21} />
            </span>
            <h2>A little goal for today</h2>
            <p>
              {today
                ? "You showed up. That's how progress happens."
                : "Finish one demo lab. Small steps add up."}
            </p>
            <div className={styles.goal}>
              <span>{today ? <Check size={20} /> : "0 / 1"}</span>
              <strong>
                {today ? "Today's goal complete" : "Your first step awaits"}
              </strong>
            </div>
          </section>
          <Milestones badges={progress.badges} />
          <div className={styles.demoNote}>
            <DemoNotice />
          </div>
        </aside>
      </div>
    </div>
  );
}
