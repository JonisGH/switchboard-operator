import Fastify from "fastify";
import { healthResponseSchema } from "@switchboard/shared";

export function createApp() {
  const app = Fastify({ logger: true });

  // Liveness only: this does not claim the database or future AI services are ready.
  app.get("/health", async () => healthResponseSchema.parse({ status: "ok" }));

  return app;
}
