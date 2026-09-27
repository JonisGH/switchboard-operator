import { useState } from "react";
import { simulatedCallResponseSchema, type SimulatedCallResult, type SimulationScenarioKey } from "@switchboard/shared";
import { CallOutcomeBadge } from "../calls/CallOutcomeBadge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import styles from "./SimulationPanel.module.css";

const scenarioLabels: Record<SimulationScenarioKey, string> = {
  OPENING_HOURS_V1: "Opening hours — caller confirms answer",
  DELIVERY_ISSUE_V1: "Missing delivery — human follow-up",
  TRANSFER_REQUEST_V1: "Transfer requested",
  UNCLEAR_ENDING_V1: "Unclear ending",
};

type Attempt = { callId: string; scenarioKey: SimulationScenarioKey };

export function SimulationPanel({ onCompleted }: { onCompleted: () => void }) {
  const [scenarioKey, setScenarioKey] = useState<SimulationScenarioKey>("OPENING_HOURS_V1");
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [failedAttempt, setFailedAttempt] = useState<Attempt | null>(null);
  const [result, setResult] = useState<SimulatedCallResult | null>(null);

  async function simulate(attempt: Attempt) {
    setState("loading");
    setResult(null);
    try {
      const response = await fetch("/api/simulated-calls", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(attempt),
      });
      if (!response.ok) throw new Error("Simulation request failed");
      const next = simulatedCallResponseSchema.parse(await response.json());
      setResult(next);
      setFailedAttempt(null);
      setState("idle");
      onCompleted();
    } catch {
      setFailedAttempt(attempt);
      setState("error");
    }
  }

  return (
    <section aria-labelledby="simulation-title" className={styles.section}>
      <h2 id="simulation-title" className={styles.heading}>Simulate an incoming call</h2>
      <Card>
        <CardContent>
          <p className={styles.description}>Choose a fictional conversation. The backend records its outcome and creates a WorkOrder only when human action is required.</p>
          <div className={styles.controls}>
            <label className={styles.field}>
              <span className={styles.label}>Scenario</span>
              <select className={styles.select} value={scenarioKey} disabled={state === "loading"}
                onChange={(event) => {
                  setScenarioKey(event.target.value as SimulationScenarioKey);
                  setResult(null);
                  setFailedAttempt(null);
                  setState("idle");
                }}>
                {Object.entries(scenarioLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
            <Button type="button" disabled={state === "loading"}
              onClick={() => void simulate({ callId: crypto.randomUUID(), scenarioKey })}>Simulate call</Button>
          </div>

          {state === "loading" && <p role="status" className={styles.feedback}>Processing fictional call…</p>}
          {state === "error" && failedAttempt && (
            <div role="alert" className={styles.feedback}>
              <p>The call could not be completed. Retry the same Call ID to avoid duplicates.</p>
              <Button className={styles.retry} type="button" variant="outline"
                onClick={() => void simulate(failedAttempt)}>Retry simulation</Button>
            </div>
          )}

          {result && (
            <div className={styles.result}>
              <h3 className={styles.resultHeading}>Recorded outcome</h3>
              <div className={styles.resultMeta}>
                <CallOutcomeBadge outcome={result.call.outcome} />
                <span>{result.workOrder ? `WorkOrder created: ${result.workOrder.title}` : "No WorkOrder created"}</span>
              </div>
              <div className={styles.comparison}>
                <section aria-labelledby="transcript-title">
                  <h4 id="transcript-title" className={styles.subheading}>Fictional transcript</h4>
                  <pre className={styles.transcript}>{result.call.transcript}</pre>
                </section>
                <section aria-labelledby="suggestion-title">
                  <h4 id="suggestion-title" className={styles.subheading}>Mock AI suggestion</h4>
                  <div className={styles.summary}>
                    <p><strong>{result.call.aiSuggestion.suggestedTitle}</strong></p>
                    <p>{result.call.aiSuggestion.summary}</p>
                    <p className={styles.detail}><strong>Caller request:</strong> {result.call.aiSuggestion.callerRequest}</p>
                    {result.call.aiSuggestion.clarificationQuestions.length > 0 && (
                      <p className={styles.detail}><strong>Needs clarification:</strong> {result.call.aiSuggestion.clarificationQuestions.join(" ")}</p>
                    )}
                  </div>
                </section>
              </div>
              <p className={styles.note}>AI-generated content is a suggestion, not a human-approved record.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
