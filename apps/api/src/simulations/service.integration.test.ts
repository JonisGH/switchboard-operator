import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import { createCallReader } from "../calls/repository.js";
import { Prisma, type PrismaClient } from "../generated/prisma/client.js";
import { createPrismaClient } from "../db.js";
import { createWorkOrderStore } from "../work-orders/repository.js";
import { createWorkOrderService } from "../work-orders/service.js";
import { mockAIProvider } from "./mock-ai.js";
import { SimulationConflictError, createSimulationService } from "./service.js";
import type { SimulationScenarioKey } from "@switchboard/shared";

// A separate schema in the local PostgreSQL container; never point this suite at demo records.
const url = process.env.TEST_DATABASE_URL;
const originalDatabaseUrl = process.env.DATABASE_URL;
if (!url || new URL(url).searchParams.get("schema") !== "switchboard_sim_test") {
  throw new Error("TEST_DATABASE_URL must explicitly target ?schema=switchboard_sim_test");
}

function twoPartyGate() {
  let signalBoth!: () => void;
  let open!: () => void;
  const bothEntered = new Promise<void>((resolve) => { signalBoth = resolve; });
  const released = new Promise<void>((resolve) => { open = resolve; });
  let arrived = 0;
  return {
    get arrived() { return arrived; },
    bothEntered,
    release: () => open(),
    async enter() {
      arrived += 1;
      if (arrived === 2) signalBoth();
      await released;
    },
  };
}

describe("PostgreSQL guarantees (isolated schema)", () => {
  let prisma: PrismaClient;
  const ids: string[] = [];
  const newId = () => { const id = randomUUID(); ids.push(id); return id; };

  beforeAll(() => {
    // Exercise the same adapter construction as the running API, not a test-only schema option.
    process.env.DATABASE_URL = url;
    prisma = createPrismaClient();
  });

  afterEach(async () => {
    await prisma.workOrder.deleteMany({ where: { callId: { in: ids } } });
    await prisma.call.deleteMany({ where: { id: { in: ids } } });
    ids.length = 0;
  });
  afterAll(async () => {
    await prisma?.$disconnect();
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it("runtime DATABASE_URL ?schema= matches the migrated schema rather than public", async () => {
    const id = newId();
    await prisma.call.create({ data: { id, startedAt: new Date() } });
    const isolated = await prisma.$queryRaw<Array<{ total: bigint }>>`
      SELECT count(*) AS total FROM "switchboard_sim_test"."Call" WHERE id = ${id}::uuid`;
    expect(isolated[0].total).toBe(1n);
    const publicTable = await prisma.$queryRaw<Array<{ relation: string | null }>>`
      SELECT to_regclass('public."Call"')::text AS relation`;
    if (publicTable[0].relation) {
      const publicRows = await prisma.$queryRaw<Array<{ total: bigint }>>`
        SELECT count(*) AS total FROM "public"."Call" WHERE id = ${id}::uuid`;
      expect(publicRows[0].total).toBe(0n);
    }
  });

  it.each([
    ["OPENING_HOURS_V1", "AI_RESOLVED", false],
    ["DELIVERY_ISSUE_V1", "HUMAN_ACTION_REQUIRED", true],
    ["TRANSFER_REQUEST_V1", "TRANSFERRED", false],
    ["UNCLEAR_ENDING_V1", "INCOMPLETE", false],
  ] as const)("persists %s as %s with WorkOrder=%s", async (scenarioKey, outcome, hasWorkOrder) => {
    const callId = newId();
    const { result, created } = await createSimulationService(prisma, mockAIProvider).simulate({ callId, scenarioKey });
    const stored = await prisma.call.findUniqueOrThrow({ where: { id: callId }, include: { workOrder: true } });

    expect(created).toBe(true);
    expect(result.call.outcome).toBe(outcome);
    expect(result.call.aiSuggestion.schemaVersion).toBe(1);
    expect(stored.outcome).toBe(outcome);
    expect(stored.simulationScenarioKey).toBe(scenarioKey);
    expect(stored.transcript).toBe(result.call.transcript);
    expect(stored.aiSuggestion).toMatchObject({ schemaVersion: 1 });
    expect(Boolean(stored.workOrder)).toBe(hasWorkOrder);
    expect(Boolean(result.workOrder)).toBe(hasWorkOrder);
  });

  it("replays the same persisted result and rejects a different scenario or unrelated terminal Call", async () => {
    const callId = newId();
    const service = createSimulationService(prisma, mockAIProvider);
    const input = { callId, scenarioKey: "DELIVERY_ISSUE_V1" as const };
    const first = await service.simulate(input);
    const summarize = vi.fn().mockRejectedValue(new Error("Must not regenerate a terminal suggestion"));
    expect(await createSimulationService(prisma, { summarize }).simulate(input))
      .toEqual({ result: first.result, created: false });
    expect(summarize).not.toHaveBeenCalled();
    expect(await prisma.workOrder.count({ where: { callId } })).toBe(1);
    await expect(service.simulate({ callId, scenarioKey: "OPENING_HOURS_V1" }))
      .rejects.toBeInstanceOf(SimulationConflictError);

    const unrelatedId = newId();
    await prisma.call.create({ data: { id: unrelatedId, startedAt: new Date(), endedAt: new Date(), outcome: "AI_RESOLVED" } });
    await expect(service.simulate({ callId: unrelatedId, scenarioKey: "OPENING_HOURS_V1" }))
      .rejects.toBeInstanceOf(SimulationConflictError);
  });

  it("two pending finalizers race; exactly one commits a Call outcome and WorkOrder", async () => {
    const callId = newId();
    await prisma.call.create({ data: {
      id: callId, startedAt: new Date(), simulationScenarioKey: "DELIVERY_ISSUE_V1", transcript: "Fictional race fixture",
    } });
    const gate = twoPartyGate();
    const service = createSimulationService(prisma, { summarize: async (input) => {
      await gate.enter();
      return mockAIProvider.summarize(input);
    } });
    const input = { callId, scenarioKey: "DELIVERY_ISSUE_V1" as const };
    const requests = [service.simulate(input), service.simulate(input)];
    await gate.bothEntered;
    try {
      expect(gate.arrived).toBe(2);
      expect((await prisma.call.findUniqueOrThrow({ where: { id: callId } })).outcome).toBeNull();
      expect(await prisma.workOrder.count({ where: { callId } })).toBe(0);
    } finally { gate.release(); }
    const results = await Promise.all(requests);

    expect(results.map(({ created }) => created).sort()).toEqual([false, true]);
    expect(results[0].result).toEqual(results[1].result);
    expect(await prisma.call.count({ where: { id: callId } })).toBe(1);
    expect(await prisma.workOrder.count({ where: { callId } })).toBe(1);
  });

  it("both creators observe a missing Call; the P2002 loser reloads the winner", async () => {
    const callId = newId();
    const gate = twoPartyGate();
    let initialReads = 0;
    let uniqueConflicts = 0;
    const wrapped = new Proxy(prisma, { get(target, key) {
      if (key !== "call") return Reflect.get(target, key);
      return new Proxy(target.call, { get(delegate, method) {
        if (method === "findUnique") return async (...args: unknown[]) => {
          const found = await (Reflect.get(delegate, method) as (...args: unknown[]) => Promise<unknown>)(...args);
          if (initialReads++ < 2) {
            expect(found).toBeNull();
            await gate.enter();
          }
          return found;
        };
        if (method === "create") return async (...args: unknown[]) => {
          try { return await (Reflect.get(delegate, method) as (...args: unknown[]) => Promise<unknown>)(...args); }
          catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") uniqueConflicts++;
            throw error;
          }
        };
        return Reflect.get(delegate, method);
      } });
    } }) as PrismaClient;
    const service = createSimulationService(wrapped, mockAIProvider);
    const input = { callId, scenarioKey: "DELIVERY_ISSUE_V1" as const };
    const requests = [service.simulate(input), service.simulate(input)];
    await gate.bothEntered;
    try {
      expect(gate.arrived).toBe(2);
      expect(await prisma.call.count({ where: { id: callId } })).toBe(0);
    } finally { gate.release(); }
    const results = await Promise.all(requests);
    expect(uniqueConflicts).toBe(1);
    expect(results.map(({ created }) => created).sort()).toEqual([false, true]);
    expect(results[0].result).toEqual(results[1].result);
    expect(await prisma.call.count({ where: { id: callId } })).toBe(1);
    expect(await prisma.workOrder.count({ where: { callId } })).toBe(1);
  });

  it("rolls back the terminal outcome if WorkOrder insertion fails, then safely retries", async () => {
    const callId = newId();
    const failingStore = (tx: Prisma.TransactionClient) => ({
      ...createWorkOrderStore(tx),
      // Let PostgreSQL's real CHECK constraint fail *inside* the finalization transaction.
      create: (input: { callId: string; title: string; description: string | null }) =>
        tx.workOrder.create({ data: { ...input, title: " \t\n" } }),
    });
    const service = createSimulationService(prisma, mockAIProvider, failingStore);
    await expect(service.simulate({ callId, scenarioKey: "DELIVERY_ISSUE_V1" }))
      .rejects.toThrow(/WorkOrder_title_not_blank_check/);

    const pending = await prisma.call.findUniqueOrThrow({ where: { id: callId } });
    expect(pending.outcome).toBeNull();
    expect(pending.endedAt).toBeNull();
    expect(pending.aiSuggestion).toBeNull();
    expect(await prisma.workOrder.count({ where: { callId } })).toBe(0);

    const retried = await createSimulationService(prisma, mockAIProvider).simulate({ callId, scenarioKey: "DELIVERY_ISSUE_V1" });
    expect(retried.result.call.outcome).toBe("HUMAN_ACTION_REQUIRED");
    expect(await prisma.workOrder.count({ where: { callId } })).toBe(1);
  });

  it("two concurrent POST requests recover the unique-callId loser outside a transaction", async () => {
    const callId = newId();
    await prisma.call.create({ data: { id: callId, startedAt: new Date(), outcome: "HUMAN_ACTION_REQUIRED" } });
    const gate = twoPartyGate();
    const store = createWorkOrderStore(prisma);
    let uniqueConflicts = 0;
    const app = createApp(createCallReader(prisma), createWorkOrderService({
      ...store,
      findByCallId: async (id) => {
        const found = await store.findByCallId(id);
        if (found === null) await gate.enter();
        return found;
      },
      create: async (input) => {
        try { return await store.create(input); }
        catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") uniqueConflicts++;
          throw error;
        }
      },
    }), createSimulationService(prisma, mockAIProvider));
    try {
      const request = { method: "POST" as const, url: `/calls/${callId}/work-order`, payload: { title: "Fictional follow-up" } };
      const requests = [app.inject(request), app.inject(request)];
      await gate.bothEntered;
      try {
        expect(gate.arrived).toBe(2);
        expect(await prisma.workOrder.count({ where: { callId } })).toBe(0);
      } finally { gate.release(); }
      const responses = await Promise.all(requests);
      expect(responses.map(({ statusCode }) => statusCode).sort()).toEqual([200, 201]);
      expect(responses[0].json()).toEqual(responses[1].json());
      expect(uniqueConflicts).toBe(1);
      expect(await prisma.workOrder.count({ where: { callId } })).toBe(1);
    } finally {
      gate.release();
      await app.close();
    }
  });

  it("Prisma surfaces the unique WorkOrder.callId index violation", async () => {
    const callId = newId();
    await prisma.call.create({ data: { id: callId, startedAt: new Date(), outcome: "HUMAN_ACTION_REQUIRED" } });
    await prisma.workOrder.create({ data: { callId, title: "First" } });
    await expect(prisma.workOrder.create({ data: { callId, title: "Second" } }))
      .rejects.toMatchObject({ code: "P2002" });
    expect(await prisma.workOrder.count({ where: { callId } })).toBe(1);
  });

  it("PostgreSQL rejects Call chronology and blank WorkOrder titles bypassing HTTP validation", async () => {
    const callId = newId();
    const startedAt = new Date("2026-09-27T10:00:00Z");
    await expect(prisma.call.create({ data: {
      id: callId, startedAt, endedAt: new Date("2026-09-27T09:59:59Z"),
    } })).rejects.toThrow(/Call_endedAt_not_before_startedAt_check/);
    expect(await prisma.call.count({ where: { id: callId } })).toBe(0);

    await prisma.call.create({ data: { id: callId, startedAt, outcome: "HUMAN_ACTION_REQUIRED" } });
    await expect(prisma.workOrder.create({ data: { callId, title: " \t\n" } }))
      .rejects.toThrow(/WorkOrder_title_not_blank_check/);
    expect(await prisma.workOrder.count({ where: { callId } })).toBe(0);
  });

  it("leaves a Call pending when mock AI output fails validation", async () => {
    const callId = newId();
    const service = createSimulationService(prisma, { summarize: async () => ({ schemaVersion: 2 }) });
    await expect(service.simulate({ callId, scenarioKey: "OPENING_HOURS_V1" })).rejects.toThrow();
    const pending = await prisma.call.findUniqueOrThrow({ where: { id: callId } });
    expect(pending.outcome).toBeNull();
    expect(pending.aiSuggestion).toBeNull();
    expect(await prisma.workOrder.count({ where: { callId } })).toBe(0);
  });

  it("validates the API request and returns 201, 200 on retry, and 409 on scenario conflict", async () => {
    const callId = newId();
    const app = createApp(createCallReader(prisma), createWorkOrderService(createWorkOrderStore(prisma)),
      createSimulationService(prisma, mockAIProvider));
    try {
      const payload = { callId, scenarioKey: "OPENING_HOURS_V1" satisfies SimulationScenarioKey };
      const request = { method: "POST" as const, url: "/simulated-calls", payload };
      expect((await app.inject({ ...request, payload: { ...payload, scenarioKey: "UNKNOWN" } })).statusCode).toBe(400);
      const first = await app.inject(request);
      const replay = await app.inject(request);
      expect(first.statusCode).toBe(201);
      expect(replay.statusCode).toBe(200);
      expect(first.json()).toEqual(replay.json());
      expect((await app.inject({ ...request, payload: { callId, scenarioKey: "DELIVERY_ISSUE_V1" } })).statusCode).toBe(409);
    } finally {
      await app.close();
    }
  });
});
