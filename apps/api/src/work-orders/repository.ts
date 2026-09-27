import type { Call, Prisma, PrismaClient, WorkOrder } from "../generated/prisma/client.js";

export type WorkOrderWithCall = WorkOrder & {
  call: Pick<Call, "callerReference" | "category" | "startedAt">;
};

export interface WorkOrderStore {
  findCall(callId: string): Promise<Pick<Call, "outcome"> | null>;
  findByCallId(callId: string): Promise<WorkOrder | null>;
  create(input: { callId: string; title: string; description: string | null }): Promise<WorkOrder>;
  listActive(): Promise<WorkOrderWithCall[]>;
}

export function createWorkOrderStore(prisma: PrismaClient | Prisma.TransactionClient): WorkOrderStore {
  return {
    findCall: (callId) => prisma.call.findUnique({ where: { id: callId }, select: { outcome: true } }),
    findByCallId: (callId) => prisma.workOrder.findUnique({ where: { callId } }),
    create: (input) => prisma.workOrder.create({ data: input }),
    listActive: () => prisma.workOrder.findMany({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
      include: { call: { select: { callerReference: true, category: true, startedAt: true } } },
      orderBy: [{ call: { startedAt: "asc" } }, { callId: "asc" }],
    }),
  };
}
