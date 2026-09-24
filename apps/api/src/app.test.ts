import { afterEach, describe, expect, it } from "vitest";
import { healthResponseSchema } from "@switchboard/shared";
import { createApp } from "./app.js";

const app = createApp();
afterEach(async () => { await app.close(); });

describe("GET /health", () => {
  it("returns the shared liveness contract", async () => {
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(healthResponseSchema.parse(response.json())).toEqual({ status: "ok" });
  });
});
