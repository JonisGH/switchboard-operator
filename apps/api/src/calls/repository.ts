import type { Call, PrismaClient } from "../generated/prisma/client.js";

export interface CallReader {
  list(): Promise<Call[]>;
}

export function createCallReader(prisma: PrismaClient): CallReader {
  return {
    list: () => prisma.call.findMany({ orderBy: [{ startedAt: "desc" }, { id: "desc" }] }),
  };
}
