import styles from "./briefing.module.css";

export function WelcomeInstructions() {
  return <section className={styles.section} aria-label="Welcome introduction">
    <h2>A friendly first step.</h2>
    <p>Welcome is a harmless introduction to your lab workspace. There is no puzzle to solve, hidden step, or vulnerability to find.</p>
    <ol><li>Choose Spawn Instance to open your session, then confirm the launch.</li><li>Wait while your page is prepared. Choose Open Welcome page once the instance is running. It openly displays a welcome flag.</li><li>Keep your session open to see its remaining time. You can stop the instance when you finish.</li></ol>
    <p>Use only the page assigned to your own session. Submit the flag shown on your page from your session. The first correct submission awards 10 points.</p>
  </section>;
}
