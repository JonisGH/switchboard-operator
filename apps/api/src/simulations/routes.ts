import type { FastifyInstance } from "fastify";
import { simulateCallRequestSchema } from "@switchboard/shared";
import { SimulationConflictError, type SimulationService } from "./service.js";

export function registerSimulationRoutes(app: FastifyInstance, simulations: SimulationService) {
  app.post("/simulated-calls", async (request, reply) => {
    const body = simulateCallRequestSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Bad Request", message: "Invalid simulation request" });

    try {
      const { result, created } = await simulations.simulate(body.data);
      return reply.code(created ? 201 : 200).send(result);
    } catch (error) {
      if (error instanceof SimulationConflictError) {
        return reply.code(409).send({ error: "Conflict", message: error.message });
      }
      throw error;
    }
  });
}
