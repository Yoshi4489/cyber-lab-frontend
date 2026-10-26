"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/provider";
import { ApiError } from "@/features/backend/api-error";
import { CatalogRecommendations } from "@/features/catalog/recommendations";
import { LearningArt } from "@/features/dashboard/learning-art";
import styles from "./landing.module.css";
import pendingStyles from "@/features/preview/preview.module.css";

export function LiveHome() {
  const { session, loading, error, refresh } = useAuth();
  return <div className={styles.page}>
    <section className={styles.hero}>
      <div className={styles.copy}>
        <h1 className={styles.identityHeading}>{session?.authenticated ? <>Welcome back,<br /><em>{session.user.displayName}.</em></> : <>Your curiosity.<br /><em>Your next superpower.</em></>}</h1>
        <p>Start with Welcome, a harmless introduction to your learning workspace. There are no puzzles or hidden steps. Lab launch is being prepared.</p>
        {loading ? <p role="status">Checking your account…</p> : error ? <><ApiError error={error} /><Button onClick={() => void refresh()}>Retry session</Button></> : <div className={styles.actions}>
          <Button asChild><Link href={session?.authenticated ? "/labs" : "/login"}>{session?.authenticated ? "Explore labs" : "Sign in to start"}<ArrowRight size={17} /></Link></Button>
          <Link href="/guide">Read the lab guide <ArrowRight size={15} /></Link>
        </div>}
        <span className={styles.note}>Public registration is closed. Use the account provided by your operator.</span>
      </div>
      <div className={styles.art}><LearningArt /></div>
    </section>
    <section>
      <div className={styles.heading}><div><h2>Your next discovery awaits.</h2><p>Read the Welcome introduction and get to know your workspace.</p></div></div>
      <div className={styles.cards}><CatalogRecommendations /></div>
    </section>
    <p className={styles.note}>Account progress and rankings are being prepared. Totals are not displayed here yet.</p>
  </div>;
}

export function LiveProgressPending({ kind }: { kind: "profile" | "rankings" }) {
  return <section className={pendingStyles.preview}>
    <h1>{kind === "profile" ? "Your profile is taking shape." : "Rankings are on their way."}</h1>
    <p>Account progress and rankings are being prepared. This page does not show totals yet.</p>
    <Button asChild><Link href="/labs">Explore published labs <ArrowRight size={16} /></Link></Button>
  </section>;
}
