"use client";
import Link from "next/link";
import { useState } from "react";
import { Download } from "lucide-react";
import type { ChallengeContent } from "@/features/backend/catalog-schemas";
import { useAuth } from "@/features/auth/provider";
import { FlagForm } from "@/features/progress/flag-form";
import { LabGuidance } from "./lab-guidance";
import styles from "./briefing.module.css";

function formatSize(bytes: number): string {
  return bytes < 1024 ? `${bytes} bytes` : `${(bytes / 1024).toFixed(1)} KB`;
}

/** Download challenges have no instance: the learner works on the files, then submits here. */
export function ArtifactPanel({ slug, challengeId, content }: { slug: string; challengeId: string; content: ChallengeContent }) {
  const { session } = useAuth();
  const [solves, setSolves] = useState(0);
  const signedIn = Boolean(session?.authenticated);
  return <>
    <section className={styles.section} aria-label="Challenge files">
      <p className="eyebrow">YOUR FILES</p><h2>Download and investigate.</h2>
      {content.artifacts.length === 0 ? <p role="status">The files for this challenge are not available yet.</p>
        : !signedIn ? <p><Link href={`/login?next=/labs/${slug}`}>Sign in</Link> to download the files and submit a flag.</p>
        : <ul className={styles.files}>{content.artifacts.map(file => <li key={file.filename}>
            <a href={`/api/challenges/${encodeURIComponent(slug)}/artifacts/${encodeURIComponent(file.filename)}`} download><Download size={15} />{file.filename}</a>
            <small>{formatSize(file.sizeBytes)} · SHA-256 <code>{file.sha256}</code></small>
          </li>)}</ul>}
      {signedIn && content.artifacts.length > 0 && <FlagForm challengeId={challengeId} enabled onSolved={() => setSolves(count => count + 1)} />}
    </section>
    <LabGuidance key={solves} slug={slug} content={content} />
  </>;
}
