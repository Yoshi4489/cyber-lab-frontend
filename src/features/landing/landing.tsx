import Link from "next/link";
import { ArrowRight, BookOpen, Heart, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CatalogRecommendations } from "@/features/catalog/recommendations";
import { LearningArt } from "@/features/dashboard/learning-art";
import styles from "./landing.module.css";

export function Landing() {
  return (
    <div className={styles.page}>
      <header className={styles.welcome}>
        <p className="eyebrow">WELCOME TO CISCOKU LAB</p>
        <span>
          <Heart size={13} /> Free for our university community
        </span>
      </header>
      <section className={styles.hero}>
        <div className={styles.copy}>
          <span className={styles.kicker}>
            <Sparkles size={14} /> SMALL STEPS. NEW POSSIBILITIES.
          </span>
          <h1>
            Your curiosity.
            <br />
            <em>Your next superpower.</em>
          </h1>
          <p>
            A friendly place to explore cybersecurity. Find your starting point,
            try something new, and build confidence one lab at a time.
          </p>
          <div className={styles.actions}>
            <Button asChild>
              <Link href="/signup">
                Join the demo <ArrowRight size={17} />
              </Link>
            </Button>
            <Link href="/labs">
              Explore the labs <ArrowRight size={15} />
            </Link>
          </div>
          <span className={styles.note}>
            Published labs · dashboard progress remains a separate demo
          </span>
        </div>
        <div className={styles.art}>
          <LearningArt />
        </div>
      </section>
      <section className={styles.steps} aria-label="How the demo works">
        {[
          {
            number: "01",
            title: "Find your starting point",
            text: "Pick a topic that sparks your curiosity.",
          },
          {
            number: "02",
            title: "Make a little progress",
            text: "Try a session at your own pace.",
          },
          {
            number: "03",
            title: "Celebrate every step",
            text: "Watch your demo skills and XP grow.",
          },
        ].map((step) => (
          <div key={step.number}>
            <span>{step.number}</span>
            <div>
              <h2>{step.title}</h2>
              <p>{step.text}</p>
            </div>
          </div>
        ))}
      </section>
      <section>
        <div className={styles.heading}>
          <div>
            <span className={styles.kicker}>
              <BookOpen size={14} /> A GOOD PLACE TO BEGIN
            </span>
            <h2>Your first discovery awaits.</h2>
            <p>No security experience? You are in the right place.</p>
          </div>
          <Link href="/labs">
            View all labs <ArrowRight size={15} />
          </Link>
        </div>
        <div className={styles.cards}>
          <CatalogRecommendations />
        </div>
      </section>
      <section className={styles.community}>
        <span>
          <Trophy size={24} />
        </span>
        <div>
          <h2>A little friendly competition.</h2>
          <p>
            Explore the sample leaderboard. There is room for every learner.
          </p>
        </div>
        <Link href="/leaderboard">
          Meet the demo community <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  );
}
