import { afterEach, describe, expect, it } from "vitest";
import { callsResponseSchema } from "@switchboard/shared";
import { createApp } from "../app.js";

const call = {
  id: "11111111-1111-4111-8111-111111111111",
  callerReference: "Demo Caller 001",
  category: "OPENING_HOURS",
  outcome: "AI_RESOLVED" as const,
  startedAt: new Date("2026-09-26T10:00:00.000Z"),
  endedAt: new Date("2026-09-26T10:02:00.000Z"),
  createdAt: new Date("2026-09-26T10:00:01.000Z"),
};

const apps: ReturnType<typeof createApp>[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("GET /calls", () => {
  it("returns validated Call data, including timestamps and outcome", async () => {
    const app = createApp({ list: async () => [call] });
    apps.push(app);
    const response = await app.inject({ method: "GET", url: "/calls" });

    expect(response.statusCode).toBe(200);
    expect(callsResponseSchema.parse(response.json())).toEqual({
      calls: [{ ...call, startedAt: call.startedAt.toISOString(), endedAt: call.endedAt.toISOString(), createdAt: call.createdAt.toISOString() }],
    });
  });

  it("includes calls without an outcome or caller reference", async () => {
    const app = createApp({ list: async () => [{ ...call, callerReference: null, category: null, outcome: null, endedAt: null }] });
    apps.push(app);
    const response = await app.inject({ method: "GET", url: "/calls" });

    expect(response.statusCode).toBe(200);
    expect(response.json().calls[0]).toMatchObject({ callerReference: null, category: null, outcome: null, endedAt: null });
  });

  it("returns an empty list when no calls have been recorded", async () => {
    const app = createApp({ list: async () => [] });
    apps.push(app);
    const response = await app.inject({ method: "GET", url: "/calls" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ calls: [] });
  });
});
