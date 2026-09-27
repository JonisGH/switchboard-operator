import { z } from "zod";

export const healthResponseSchema = z.object({ status: z.literal("ok") });
export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const callOutcomeSchema = z.enum([
  "AI_RESOLVED",
  "HUMAN_ACTION_REQUIRED",
  "TRANSFERRED",
  "INCOMPLETE",
]);

export const callSchema = z.object({
  id: z.uuid(),
  callerReference: z.string().nullable(),
  category: z.string().nullable(),
  outcome: callOutcomeSchema.nullable(),
  startedAt: z.iso.datetime(),
  endedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});

export const callsResponseSchema = z.object({ calls: z.array(callSchema) });
export type CallRecord = z.infer<typeof callSchema>;
export type CallOutcome = z.infer<typeof callOutcomeSchema>;
