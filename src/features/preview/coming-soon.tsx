import Link from "next/link";
import { ArrowRight, Map, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import styles from "./preview.module.css";

export function ComingSoon({ kind, preview = true }: { kind: "paths" | "profile"; preview?: boolean }) {
  const paths = kind === "paths";
  const Icon = paths ? Map : UserRound;
  return (
    <section className={styles.preview}>
      <span className={styles.icon}>
        <Icon size={32} strokeWidth={1.5} />
      </span>
      <p className="eyebrow">A PEEK AT WHAT IS NEXT</p>
      <h1>
        {paths
          ? "Learning paths are growing."
          : "Your profile is taking shape."}
      </h1>
      <p>
        {paths
          ? "A little direction can make a big difference. Guided paths will help you connect your skills, one lab at a time."
          : "A space to look back at your progress and celebrate what you have learned."}
      </p>
      <span className={styles.pill}>Preview · coming in a later phase</span>
      <div>
        <Button asChild>
          <Link href="/labs">
            {preview ? "Explore the sample labs" : "Explore published labs"} <ArrowRight size={16} />
          </Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    </section>
  );
}
