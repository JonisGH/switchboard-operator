import { expect, it, vi } from "vitest";
import type { PrismaClient } from "../generated/prisma/client.js";
import { createWorkOrderStore } from "./repository.js";

it("loads only active WorkOrders, oldest source Call first with a stable tie-breaker", async () => {
  const findMany = vi.fn().mockResolvedValue([]);
  const prisma = { workOrder: { findMany } } as unknown as PrismaClient;

  await createWorkOrderStore(prisma).listActive();

  expect(findMany).toHaveBeenCalledWith({
    where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
    include: { call: { select: { callerReference: true, category: true, startedAt: true } } },
    orderBy: [{ call: { startedAt: "asc" } }, { callId: "asc" }],
  });
});
