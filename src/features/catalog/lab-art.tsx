import {
  Cookie,
  Terminal,
  KeyRound,
  Network,
  Fingerprint,
  LockKeyhole,
} from "lucide-react";
import type { Lab } from "./data";
import type { LiveLab } from "./live";
import styles from "./art.module.css";
const icons = {
  cookie: Cookie,
  terminal: Terminal,
  cipher: KeyRound,
  network: Network,
  fingerprint: Fingerprint,
  lock: LockKeyhole,
};
export function LabArt({ lab, large = false }: { lab: Lab | LiveLab; large?: boolean }) {
  const Icon = icons[lab.artwork];
  return (
    <div
      className={styles.art}
      data-accent={lab.accent}
      data-large={large}
      aria-hidden="true"
    >
      <div className={styles.grid} />
      <div className={styles.orbit} />
      <div className={styles.orbit} />
      <span className={styles.icon}>
        <Icon strokeWidth={1.5} />
      </span>
      <span className={styles.plus}>+</span>
      <span className={styles.code}>
        {lab.category.toUpperCase()} / EXPLORE
      </span>
    </div>
  );
}
