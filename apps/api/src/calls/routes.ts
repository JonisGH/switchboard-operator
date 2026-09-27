import type { FastifyInstance } from "fastify";
import { callsResponseSchema } from "@switchboard/shared";
import type { CallReader } from "./repository.js";

export function registerCallsRoutes(app: FastifyInstance, calls: CallReader) {
  app.get("/calls", async () => {
    const records = await calls.list();
    return callsResponseSchema.parse({
      calls: records.map((call) => ({
        id: call.id,
        callerReference: call.callerReference,
        category: call.category,
        outcome: call.outcome,
        startedAt: call.startedAt.toISOString(),
        endedAt: call.endedAt?.toISOString() ?? null,
        createdAt: call.createdAt.toISOString(),
      })),
    });
  });
}
