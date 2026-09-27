import { Prisma, type WorkOrder } from "../generated/prisma/client.js";
import type { WorkOrderStore, WorkOrderWithCall } from "./repository.js";

export class CallNotFoundError extends Error {}
export class CallNotEligibleError extends Error {}

export interface WorkOrderService {
  createForCall(input: { callId: string; title: string; description?: string | null }): Promise<{ workOrder: WorkOrder; created: boolean }>;
  listActive(): Promise<WorkOrderWithCall[]>;
}

export function createWorkOrderService(store: WorkOrderStore): WorkOrderService {
  return {
    async createForCall({ callId, title, description }) {
      const call = await store.findCall(callId);
      if (!call) throw new CallNotFoundError("Call not found");
      if (call.outcome !== "HUMAN_ACTION_REQUIRED") {
        throw new CallNotEligibleError("Only calls requiring human action can create a WorkOrder");
      }

      const existing = await store.findByCallId(callId);
      if (existing) return { workOrder: existing, created: false };

      try {
        const workOrder = await store.create({ callId, title, description: description ?? null });
        return { workOrder, created: true };
      } catch (error) {
        // Concurrent retries can pass the read above. The unique callId index is authoritative.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          const concurrent = await store.findByCallId(callId);
          if (concurrent) return { workOrder: concurrent, created: false };
        }
        throw error;
      }
    },
    listActive: () => store.listActive(),
  };
}
