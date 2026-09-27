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

export const workOrderStatusSchema = z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]);
export const activeWorkOrderStatusSchema = workOrderStatusSchema.extract(["OPEN", "IN_PROGRESS"]);
export const workOrderCallParamsSchema = z.object({ callId: z.uuid() });

export const createWorkOrderSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1).nullable().optional(),
});

export const workOrderSchema = z.object({
  id: z.uuid(),
  callId: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  status: workOrderStatusSchema,
  createdAt: z.iso.datetime(),
});

export const workOrderResponseSchema = z.object({ workOrder: workOrderSchema });
export const workOrdersResponseSchema = z.object({
  workOrders: z.array(workOrderSchema.extend({
    status: activeWorkOrderStatusSchema,
    call: z.object({
      callerReference: z.string().nullable(),
      category: z.string().nullable(),
      startedAt: z.iso.datetime(),
    }),
  })),
});

export type WorkOrderQueueItem = z.infer<typeof workOrdersResponseSchema>["workOrders"][number];

export const simulationScenarioKeySchema = z.enum([
  "OPENING_HOURS_V1",
  "DELIVERY_ISSUE_V1",
  "TRANSFER_REQUEST_V1",
  "UNCLEAR_ENDING_V1",
]);
export type SimulationScenarioKey = z.infer<typeof simulationScenarioKeySchema>;

export const structuredSuggestionSchema = z.strictObject({
  schemaVersion: z.literal(1),
  suggestedTitle: z.string().trim().min(1),
  suggestedCategory: z.string().trim().min(1).nullable(),
  summary: z.string().trim().min(1),
  callerRequest: z.string().trim().min(1),
  clarificationQuestions: z.array(z.string().trim().min(1)),
});
export type StructuredSuggestion = z.infer<typeof structuredSuggestionSchema>;

export const simulateCallRequestSchema = z.object({
  callId: z.uuid(),
  scenarioKey: simulationScenarioKeySchema,
});
export const simulatedCallResponseSchema = z.object({
  call: callSchema.extend({
    outcome: callOutcomeSchema,
    endedAt: z.iso.datetime(),
    simulationScenarioKey: simulationScenarioKeySchema,
    transcript: z.string().min(1),
    aiSuggestion: structuredSuggestionSchema,
  }),
  workOrder: workOrderSchema.nullable(),
});
export type SimulatedCallResult = z.infer<typeof simulatedCallResponseSchema>;
