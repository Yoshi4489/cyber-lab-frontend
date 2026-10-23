"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Sprout, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { enterDemo, useLearner } from "./store";
import { DemoNotice } from "./demo-notice";
import { safeDestination } from "@/features/auth/client";
import styles from "./learner.module.css";

export function Signup({ destination }: { destination: string }) {
  const router = useRouter();
  const { learner, ready } = useLearner();
  const [error, setError] = useState("");
  return (
    <div className={styles.onboarding}>
      <section className={styles.intro}>
        <span className={styles.icon}>
          <Sprout size={32} />
        </span>
        <p className="eyebrow">YOUR NEXT CHAPTER</p>
        <h1>
          A little curiosity.
          <br />A lot of possibility.
        </h1>
        <p>
          Make yourself at home. Explore security at your own pace, celebrate
          small wins, and see how far you can go.
        </p>
        <ul>
          {[
            "12 sample labs to explore",
            "A space for every skill level",
            "Free for our university community",
          ].map((text) => (
            <li key={text}>
              <Check size={17} />
              {text}
            </li>
          ))}
        </ul>
      </section>
      <section className={styles.formPanel}>
        <span className={styles.pill}>CLICKABLE DEMO</span>
        <h2>What should we call you?</h2>
        <p>Choose a username to try your learning dashboard.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const name = String(
              new FormData(event.currentTarget).get("username") ?? "",
            );
            if (!enterDemo(name)) {
              setError("Use 2–24 letters, numbers, underscores, or hyphens.");
              return;
            }
            router.push(safeDestination(destination));
          }}
        >
          <label htmlFor="username">Username</label>
          <input
            key={ready ? (learner.username ?? "new") : "loading"}
            id="username"
            name="username"
            disabled={!ready}
            defaultValue={ready ? (learner.username ?? "") : ""}
            placeholder="e.g. curious_owl"
            autoComplete="off"
            minLength={2}
            maxLength={24}
            required
            aria-describedby="username-help username-error"
            aria-invalid={Boolean(error)}
          />
          <p id="username-help">
            2–24 letters, numbers, underscores, or hyphens.
          </p>
          <p id="username-error" role="alert">
            {error}
          </p>
          <Button className="full-width" disabled={!ready}>
            Continue <ArrowRight size={16} />
          </Button>
        </form>
        <div className={styles.notice}>
          <DemoNotice />
          This is a demo profile, not a real account. No password or university
          email needed.
        </div>
        <Link href="/labs" className={styles.back}>
          Keep browsing as a guest →
        </Link>
      </section>
    </div>
  );
}
