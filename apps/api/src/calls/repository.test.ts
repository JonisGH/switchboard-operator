import { expect, it, vi } from "vitest";
import type { PrismaClient } from "../generated/prisma/client.js";
import { createCallReader } from "./repository.js";

it("orders Call History newest first with ID as a stable tie-breaker", async () => {
  const findMany = vi.fn().mockResolvedValue([]);
  const prisma = { call: { findMany } } as unknown as PrismaClient;

  await createCallReader(prisma).list();

  expect(findMany).toHaveBeenCalledWith({
    select: { id: true, callerReference: true, category: true, outcome: true,
      startedAt: true, endedAt: true, createdAt: true },
    orderBy: [{ startedAt: "desc" }, { id: "desc" }],
  });
});
