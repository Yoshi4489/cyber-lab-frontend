import Link from "next/link";
import { Button } from "@/components/ui/button";
import styles from "./learner.module.css";

export function AccountNotice() {
  return <section className={styles.formPanel}>
    <h1>A username is all you need.</h1>
    <p>Accounts are simulated in this demo. There is no email to verify or password to reset.</p>
    <p>Choose a demo username to explore. Your sample progress stays in this browser.</p>
    <Button asChild><Link href="/login">Choose a demo username</Link></Button>
    <p><Link href="/labs">Explore the sample labs</Link></p>
  </section>;
}
