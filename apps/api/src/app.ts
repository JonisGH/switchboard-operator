import Fastify from "fastify";
import { healthResponseSchema } from "@switchboard/shared";
import type { CallReader } from "./calls/repository.js";
import { registerCallsRoutes } from "./calls/routes.js";
import { registerWorkOrderRoutes } from "./work-orders/routes.js";
import type { WorkOrderService } from "./work-orders/service.js";

export function createApp(calls: CallReader, workOrders: WorkOrderService) {
  const app = Fastify({ logger: true });

  // Liveness only: this does not claim the database or future AI services are ready.
  app.get("/health", async () => healthResponseSchema.parse({ status: "ok" }));

  registerCallsRoutes(app, calls);
  registerWorkOrderRoutes(app, workOrders);

  return app;
}
