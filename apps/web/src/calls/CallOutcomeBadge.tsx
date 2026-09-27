import type { ComponentProps } from "react";
import type { CallOutcome } from "@switchboard/shared";
import { Badge } from "../components/ui/badge";

const outcomes = {
  AI_RESOLVED: { label: "AI resolved", variant: "success" },
  HUMAN_ACTION_REQUIRED: { label: "Follow-up required", variant: "warning" },
  TRANSFERRED: { label: "Transferred", variant: "secondary" },
  INCOMPLETE: { label: "Incomplete", variant: "destructive" },
} satisfies Record<CallOutcome, { label: string; variant: ComponentProps<typeof Badge>["variant"] }>;

export function CallOutcomeBadge({ outcome }: { outcome: CallOutcome | null }) {
  if (outcome === null) return <Badge variant="outline">Outcome pending</Badge>;
  const { label, variant } = outcomes[outcome];
  return <Badge variant={variant}>{label}</Badge>;
}
