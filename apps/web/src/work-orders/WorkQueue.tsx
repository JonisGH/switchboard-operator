import { useEffect, useState } from "react";
import { workOrdersResponseSchema, type WorkOrderQueueItem } from "@switchboard/shared";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import styles from "./WorkQueue.module.css";

type LoadState = { kind: "loading" } | { kind: "error" } | { kind: "ready"; workOrders: WorkOrderQueueItem[] };
const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
const formatCategory = (category: string) => category.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());

export function WorkQueue({ refreshKey = 0 }: { refreshKey?: number }) {
  const [loadState, setLoadState] = useState<LoadState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoadState({ kind: "loading" });

    async function loadWorkOrders() {
      try {
        const response = await fetch("/api/work-orders", { signal: controller.signal });
        if (!response.ok) throw new Error("Work Queue request failed");
        const { workOrders } = workOrdersResponseSchema.parse(await response.json());
        if (!controller.signal.aborted) setLoadState({ kind: "ready", workOrders });
      } catch {
        if (!controller.signal.aborted) setLoadState({ kind: "error" });
      }
    }

    void loadWorkOrders();
    return () => controller.abort();
  }, [attempt, refreshKey]);

  return (
    <section aria-labelledby="work-queue-title" className={styles.section}>
      <h2 id="work-queue-title" className={styles.heading}>Work Queue</h2>
      <Card>
        <CardContent>
          {loadState.kind === "loading" && <p role="status" className={styles.state}>Loading work orders…</p>}
          {loadState.kind === "error" && (
            <div role="alert" className={styles.state}>
              <p>Work Queue could not be loaded. Check the API connection and try again.</p>
              <Button className={styles.retry} type="button" variant="outline" onClick={() => setAttempt((value) => value + 1)}>Retry Work Queue</Button>
            </div>
          )}
          {loadState.kind === "ready" && loadState.workOrders.length === 0 && (
            <p className={styles.state}>No work orders need action right now.</p>
          )}
          {loadState.kind === "ready" && loadState.workOrders.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Work order</TableHead>
                  <TableHead scope="col">Category</TableHead>
                  <TableHead scope="col">Caller</TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col">Waiting since</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadState.workOrders.map((workOrder) => (
                  <TableRow key={workOrder.id}>
                    <TableCell>
                      <span className={styles.title}>{workOrder.title}</span>
                      {workOrder.description && <p className={styles.description}>{workOrder.description}</p>}
                    </TableCell>
                    <TableCell>{workOrder.call.category ? formatCategory(workOrder.call.category) : <span className={styles.muted}>Unclassified</span>}</TableCell>
                    <TableCell>{workOrder.call.callerReference ?? <span className={styles.muted}>Unknown caller</span>}</TableCell>
                    <TableCell><Badge variant={workOrder.status === "OPEN" ? "warning" : "secondary"}>{workOrder.status === "OPEN" ? "Open" : "In progress"}</Badge></TableCell>
                    <TableCell><time className={styles.muted} dateTime={workOrder.call.startedAt}>{dateFormatter.format(new Date(workOrder.call.startedAt))}</time></TableCell>
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
