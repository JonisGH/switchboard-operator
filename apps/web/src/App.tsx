import { useState } from "react";
import { Badge } from "./components/ui/badge";
import { CallHistory } from "./calls/CallHistory";
import { WorkQueue } from "./work-orders/WorkQueue";
import { SimulationPanel } from "./simulations/SimulationPanel";
import styles from "./App.module.css";

export function App() {
  const [refreshKey, setRefreshKey] = useState(0);
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
          Review all recorded calls in Call History and find requests requiring human follow-up
          in the Work Queue. All information shown here is fictional demo data.
        </p>
      </div>
      <SimulationPanel onCompleted={() => setRefreshKey((key) => key + 1)} />
      <WorkQueue refreshKey={refreshKey} />
      <CallHistory refreshKey={refreshKey} />
      <p className={styles.disclaimer}>Fictional demonstration only. Not a production phone service.</p>
    </main>
  );
}
