import { afterEach, describe, expect, it, vi } from "vitest";
import { workOrderResponseSchema, workOrdersResponseSchema } from "@switchboard/shared";
import { createApp } from "../app.js";
import type { WorkOrderService } from "./service.js";
import { CallNotEligibleError, CallNotFoundError } from "./service.js";

const callId = "22222222-2222-4222-8222-222222222222";
const workOrder = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", callId, title: "Missing delivery",
  description: null, status: "OPEN" as const, createdAt: new Date("2026-09-27T10:00:00Z"),
};
const apps: ReturnType<typeof createApp>[] = [];

function appWith(service: Partial<WorkOrderService> = {}) {
  const app = createApp({ list: async () => [] }, {
    listActive: async () => [],
    createForCall: async () => ({ workOrder, created: true }),
    ...service,
  });
  apps.push(app);
  return app;
}

afterEach(async () => { await Promise.all(apps.splice(0).map((app) => app.close())); });

describe("WorkOrder routes", () => {
  it("returns a validated active queue with its originating Call", async () => {
    const app = appWith({ listActive: async () => [{ ...workOrder, call: {
      callerReference: "Demo Caller 002", category: "DELIVERY_ISSUE", startedAt: new Date("2026-09-26T10:00:00Z"),
    } }] });
    const response = await app.inject({ method: "GET", url: "/work-orders" });
    expect(response.statusCode).toBe(200);
    expect(workOrdersResponseSchema.parse(response.json()).workOrders[0]).toMatchObject({
      callId, title: "Missing delivery", call: { category: "DELIVERY_ISSUE" },
    });
  });

  it("returns an empty active queue", async () => {
    const response = await appWith().inject({ method: "GET", url: "/work-orders" });
    expect(response.json()).toEqual({ workOrders: [] });
  });

  it("creates once and returns the existing WorkOrder on retry", async () => {
    const createForCall = vi.fn().mockResolvedValueOnce({ workOrder, created: true }).mockResolvedValueOnce({ workOrder, created: false });
    const app = appWith({ createForCall });
    const request = { method: "POST" as const, url: `/calls/${callId}/work-order`, payload: { title: "  Missing delivery  " } };
    const first = await app.inject(request);
    const second = await app.inject(request);
    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(200);
    expect(workOrderResponseSchema.parse(first.json())).toEqual(second.json());
    expect(createForCall).toHaveBeenCalledWith({ callId, title: "Missing delivery" });
  });

  it("rejects malformed requests and maps missing/ineligible Calls", async () => {
    const createForCall = vi.fn().mockRejectedValueOnce(new CallNotFoundError("Call not found"))
      .mockRejectedValueOnce(new CallNotEligibleError("Only calls requiring human action can create a WorkOrder"));
    const app = appWith({ createForCall });
    expect((await app.inject({ method: "POST", url: "/calls/not-a-uuid/work-order", payload: { title: "Okay" } })).statusCode).toBe(400);
    expect((await app.inject({ method: "POST", url: `/calls/${callId}/work-order`, payload: { title: "  " } })).statusCode).toBe(400);
    expect((await app.inject({ method: "POST", url: `/calls/${callId}/work-order`, payload: { title: "Okay" } })).statusCode).toBe(404);
    expect((await app.inject({ method: "POST", url: `/calls/${callId}/work-order`, payload: { title: "Okay" } })).statusCode).toBe(409);
  });
});
