import { describe, expect, it, vi } from "vitest";
import { Prisma, type WorkOrder } from "../generated/prisma/client.js";
import type { WorkOrderStore } from "./repository.js";
import { CallNotEligibleError, CallNotFoundError, createWorkOrderService } from "./service.js";

const callId = "22222222-2222-4222-8222-222222222222";
const workOrder: WorkOrder = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", callId,
  title: "Missing delivery", description: null, status: "OPEN", createdAt: new Date("2026-09-27T10:00:00Z"),
};

function fakeStore(overrides: Partial<WorkOrderStore> = {}): WorkOrderStore {
  return {
    findCall: vi.fn().mockResolvedValue({ outcome: "HUMAN_ACTION_REQUIRED" }),
    findByCallId: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(workOrder),
    listActive: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe("createForCall", () => {
  it("creates one WorkOrder for an eligible Call, then returns it on retry", async () => {
    const store = fakeStore();
    const service = createWorkOrderService(store);
    const input = { callId, title: "Missing delivery" };

    expect(await service.createForCall(input)).toEqual({ workOrder, created: true });
    vi.mocked(store.findByCallId).mockResolvedValue(workOrder);
    expect(await service.createForCall(input)).toEqual({ workOrder, created: false });
    expect(store.create).toHaveBeenCalledTimes(1);
    expect(store.create).toHaveBeenCalledWith({ ...input, description: null });
  });

  it.each(["AI_RESOLVED", "TRANSFERRED", "INCOMPLETE", null] as const)(
    "rejects a Call with outcome %s",
    async (outcome) => {
      const store = fakeStore({ findCall: vi.fn().mockResolvedValue({ outcome }) });
      await expect(createWorkOrderService(store).createForCall({ callId, title: "No work" })).rejects.toBeInstanceOf(CallNotEligibleError);
      expect(store.create).not.toHaveBeenCalled();
    },
  );

  it("rejects a missing Call", async () => {
    const store = fakeStore({ findCall: vi.fn().mockResolvedValue(null) });
    await expect(createWorkOrderService(store).createForCall({ callId, title: "No call" })).rejects.toBeInstanceOf(CallNotFoundError);
    expect(store.create).not.toHaveBeenCalled();
  });

  it("returns the winner when concurrent creation hits the unique callId constraint", async () => {
    const uniqueConflict = new Prisma.PrismaClientKnownRequestError("Unique callId", { code: "P2002", clientVersion: "7.10.0" });
    const store = fakeStore({
      findByCallId: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(workOrder),
      create: vi.fn().mockRejectedValue(uniqueConflict),
    });
    expect(await createWorkOrderService(store).createForCall({ callId, title: "Missing delivery" }))
      .toEqual({ workOrder, created: false });
  });
});
