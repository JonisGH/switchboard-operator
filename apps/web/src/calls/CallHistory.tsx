import { useEffect, useState } from "react";
import { callsResponseSchema, type CallRecord } from "@switchboard/shared";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { CallOutcomeBadge } from "./CallOutcomeBadge";
import styles from "./CallHistory.module.css";

type LoadState = { kind: "loading" } | { kind: "error" } | { kind: "ready"; calls: CallRecord[] };

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
const formatCategory = (category: string) => category.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());

export function CallHistory() {
  const [loadState, setLoadState] = useState<LoadState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoadState({ kind: "loading" });

    async function loadCalls() {
      try {
        const response = await fetch("/api/calls", { signal: controller.signal });
        if (!response.ok) throw new Error("Calls request failed");
        const { calls } = callsResponseSchema.parse(await response.json());
        if (!controller.signal.aborted) setLoadState({ kind: "ready", calls });
      } catch {
        if (!controller.signal.aborted) setLoadState({ kind: "error" });
      }
    }

    void loadCalls();
    return () => controller.abort();
  }, [attempt]);

  return (
    <section aria-labelledby="call-history-title" className={styles.section}>
      <h2 id="call-history-title" className={styles.heading}>Call History</h2>
      <Card>
        <CardContent>
          {loadState.kind === "loading" && <p role="status" className={styles.state}>Loading calls…</p>}
          {loadState.kind === "error" && (
            <div role="alert" className={styles.state}>
              <p>Call History could not be loaded. Check the API connection and try again.</p>
              <Button className={styles.retry} type="button" variant="outline" onClick={() => setAttempt((value) => value + 1)}>Retry</Button>
            </div>
          )}
          {loadState.kind === "ready" && loadState.calls.length === 0 && (
            <p className={styles.state}>No calls have been recorded yet.</p>
          )}
          {loadState.kind === "ready" && loadState.calls.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Caller</TableHead>
                  <TableHead scope="col">Request</TableHead>
                  <TableHead scope="col">Outcome</TableHead>
                  <TableHead scope="col">Started</TableHead>
                  <TableHead scope="col">Recorded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadState.calls.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell>{call.callerReference ?? <span className={styles.fallback}>Unknown caller</span>}</TableCell>
                    <TableCell className={call.category ? styles.category : styles.fallback}>
                      {call.category ? formatCategory(call.category) : "Unclassified"}
                    </TableCell>
                    <TableCell><CallOutcomeBadge outcome={call.outcome} /></TableCell>
                    <TableCell><time className={styles.timestamp} dateTime={call.startedAt}>{dateFormatter.format(new Date(call.startedAt))}</time></TableCell>
                    <TableCell><time className={styles.timestamp} dateTime={call.createdAt}>{dateFormatter.format(new Date(call.createdAt))}</time></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
