import styles from "./briefing.module.css";

export function WelcomeInstructions() {
  return <section className={styles.section} aria-label="Welcome introduction">
    <h2>A friendly first step.</h2>
    <p>Welcome is a harmless introduction to your lab workspace. There is no puzzle to solve, hidden step, or vulnerability to find.</p>
    <ol><li>When lab launch is ready, choose Spawn Instance to prepare your own Welcome page.</li><li>Open the assigned page once the instance is running. It will openly display a welcome flag.</li><li>When submission is ready, copy that displayed flag back into your session and choose Submit flag.</li></ol>
    <p>Use only the page assigned to your own session. Lab launch and flag submission are being prepared.</p>
  </section>;
}
