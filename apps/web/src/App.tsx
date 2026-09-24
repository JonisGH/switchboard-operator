import { useEffect, useState } from "react";
import { healthResponseSchema } from "@switchboard/shared";
import { Badge } from "./components/ui/badge";
import { Card, CardContent } from "./components/ui/card";
import styles from "./App.module.css";

type ApiState = "checking" | "online" | "unavailable";

export function App() {
  const [apiState, setApiState] = useState<ApiState>("checking");

  useEffect(() => {
    const controller = new AbortController();
    async function checkHealth() {
      try {
        const response = await fetch("/api/health", { signal: controller.signal });
        if (!response.ok) throw new Error("Health request failed");
        healthResponseSchema.parse(await response.json());
        setApiState("online");
      } catch {
        if (!controller.signal.aborted) setApiState("unavailable");
      }
    }
    void checkHealth();
    return () => controller.abort();
  }, []);

  return (
    <main className={styles.page}>
      <header className={styles.masthead}>
        <span className={styles.brand}>Switchboard Operator</span>
        <Badge variant="secondary">Technical demo</Badge>
      </header>
      <div className={styles.intro}>
        <p className={styles.eyebrow}>Foundation</p>
        <h1 className={styles.heading}>Incoming communication, made actionable.</h1>
        <p className={styles.description}>
          An AI-assisted healthcare communication prototype. The call history and staff work queue
          will be added in upcoming milestones; no real patient data belongs here.
        </p>
      </div>
      <section aria-labelledby="connection-title" className={styles.connection}>
        <Card>
          <CardContent>
            <h2 id="connection-title" className={styles.connectionTitle}>Application connection</h2>
            <p role="status" className={styles.connectionStatus}>
              API: {apiState === "checking" ? "Checking…" : apiState === "online" ? "Connected" : "Unavailable — start the API with pnpm dev"}
            </p>
          </CardContent>
        </Card>
      </section>
      <p className={styles.disclaimer}>Fictional demonstration only. Not a production healthcare system.</p>
    </main>
  );
}
