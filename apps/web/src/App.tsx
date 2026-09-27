import { Badge } from "./components/ui/badge";
import { CallHistory } from "./calls/CallHistory";
import styles from "./App.module.css";

export function App() {
  return (
    <main className={styles.page}>
      <header className={styles.masthead}>
        <span className={styles.brand}>Switchboard Operator</span>
        <Badge variant="secondary">Technical demo</Badge>
      </header>
      <div className={styles.intro}>
        <p className={styles.eyebrow}>Incoming calls</p>
        <h1 className={styles.heading}>Incoming communication, made actionable.</h1>
        <p className={styles.description}>
          A record of every incoming call, including calls that need no human follow-up.
          The Work Queue will be introduced in a later milestone.
        </p>
      </div>
      <CallHistory />
      <p className={styles.disclaimer}>Fictional demonstration only. Not a production phone service.</p>
    </main>
  );
}
