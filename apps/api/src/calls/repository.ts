import type { Call, PrismaClient } from "../generated/prisma/client.js";

type CallListItem = Pick<Call, "id" | "callerReference" | "category" | "outcome" | "startedAt" | "endedAt" | "createdAt">;

export interface CallReader {
  list(): Promise<CallListItem[]>;
}

export function createCallReader(prisma: PrismaClient): CallReader {
  return {
    list: () => prisma.call.findMany({
      select: { id: true, callerReference: true, category: true, outcome: true,
        startedAt: true, endedAt: true, createdAt: true },
      orderBy: [{ startedAt: "desc" }, { id: "desc" }],
    }),
  };
}
