import { simulatedCallResponseSchema, structuredSuggestionSchema, type SimulatedCallResult,
  type SimulationScenarioKey } from "@switchboard/shared";
import { Prisma, type Call, type PrismaClient, type WorkOrder } from "../generated/prisma/client.js";
import { createWorkOrderStore, type WorkOrderStore } from "../work-orders/repository.js";
import { createEligibleWorkOrder } from "../work-orders/service.js";
import type { AIProvider } from "./mock-ai.js";
import { outcomeFromCallerResponse, scenarios } from "./scenarios.js";

type PersistedCall = Call & { workOrder: WorkOrder | null };

export class SimulationConflictError extends Error {}
class AlreadyFinalizedError extends Error {}

export interface SimulationService {
  simulate(input: { callId: string; scenarioKey: SimulationScenarioKey }): Promise<{
    result: SimulatedCallResult;
    created: boolean;
  }>;
}

function checkScenario(call: Call, scenarioKey: SimulationScenarioKey) {
  if (call.simulationScenarioKey !== scenarioKey) {
    throw new SimulationConflictError("Call ID already belongs to a different request");
  }
}

function persistedResult(call: PersistedCall): SimulatedCallResult {
  if (!call.outcome || !call.endedAt || !call.transcript || !call.simulationScenarioKey) {
    throw new Error("Completed simulated Call is missing its persisted result");
  }
  const suggestion = structuredSuggestionSchema.parse(call.aiSuggestion);
  return simulatedCallResponseSchema.parse({
    call: {
      id: call.id, callerReference: call.callerReference, category: call.category,
      outcome: call.outcome, startedAt: call.startedAt.toISOString(), endedAt: call.endedAt.toISOString(),
      createdAt: call.createdAt.toISOString(), simulationScenarioKey: call.simulationScenarioKey,
      transcript: call.transcript, aiSuggestion: suggestion,
    },
    workOrder: call.workOrder && {
      id: call.workOrder.id, callId: call.workOrder.callId, title: call.workOrder.title,
      description: call.workOrder.description, status: call.workOrder.status,
      createdAt: call.workOrder.createdAt.toISOString(),
    },
  });
}

export function createSimulationService(
  prisma: PrismaClient,
  ai: AIProvider,
  workOrderStoreForTransaction: (tx: Prisma.TransactionClient) => WorkOrderStore = createWorkOrderStore,
): SimulationService {
  const load = (callId: string) => prisma.call.findUnique({ where: { id: callId }, include: { workOrder: true } });

  return {
    async simulate({ callId, scenarioKey }) {
      const scenario = scenarios[scenarioKey];
      let call = await load(callId);
      if (!call) {
        try {
          call = await prisma.call.create({
            data: {
              id: callId, callerReference: scenario.callerReference, category: scenario.category,
              startedAt: new Date(), simulationScenarioKey: scenarioKey, transcript: scenario.transcript,
            },
            include: { workOrder: true },
          });
        } catch (error) {
          // The other request may have created this Call with the same client-generated ID.
          if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
          call = await load(callId);
          if (!call) throw error;
        }
      }
      checkScenario(call, scenarioKey);
      if (call.outcome !== null) return { result: persistedResult(call), created: false };
      if (!call.transcript) throw new Error("Pending simulated Call has no transcript");

      // The provider suggests content only. The fictional caller response determines the business outcome.
      const suggestion = structuredSuggestionSchema.parse(await ai.summarize({ transcript: call.transcript, scenarioKey }));
      const outcome = outcomeFromCallerResponse(scenario.callerResponse);

      try {
        const finalized = await prisma.$transaction(async (tx) => {
          const updated = await tx.call.updateMany({
            where: { id: callId, simulationScenarioKey: scenarioKey, outcome: null },
            data: { outcome, endedAt: new Date(), aiSuggestion: suggestion },
          });
          if (updated.count !== 1) throw new AlreadyFinalizedError();

          if (outcome === "HUMAN_ACTION_REQUIRED") {
            await createEligibleWorkOrder(workOrderStoreForTransaction(tx), {
              callId, title: suggestion.suggestedTitle, description: suggestion.callerRequest,
            });
          }
          return tx.call.findUniqueOrThrow({ where: { id: callId }, include: { workOrder: true } });
        });
        return { result: persistedResult(finalized), created: true };
      } catch (error) {
        if (error instanceof AlreadyFinalizedError) {
          const winner = await load(callId);
          if (winner) {
            checkScenario(winner, scenarioKey);
            if (winner.outcome !== null) return { result: persistedResult(winner), created: false };
          }
        }
        throw error;
      }
    },
  };
}
