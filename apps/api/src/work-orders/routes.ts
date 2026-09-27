import type { FastifyInstance } from "fastify";
import { createWorkOrderSchema, workOrderCallParamsSchema, workOrderResponseSchema, workOrdersResponseSchema } from "@switchboard/shared";
import type { WorkOrder } from "../generated/prisma/client.js";
import { CallNotEligibleError, CallNotFoundError, type WorkOrderService } from "./service.js";

function serializeWorkOrder(workOrder: WorkOrder) {
  return { id: workOrder.id, callId: workOrder.callId, title: workOrder.title,
    description: workOrder.description, status: workOrder.status, createdAt: workOrder.createdAt.toISOString() };
}

export function registerWorkOrderRoutes(app: FastifyInstance, workOrders: WorkOrderService) {
  app.get("/work-orders", async () => {
    const records = await workOrders.listActive();
    return workOrdersResponseSchema.parse({
      workOrders: records.map((record) => ({ ...serializeWorkOrder(record), call: {
        callerReference: record.call.callerReference,
        category: record.call.category,
        startedAt: record.call.startedAt.toISOString(),
      } })),
    });
  });

  app.post("/calls/:callId/work-order", async (request, reply) => {
    const params = workOrderCallParamsSchema.safeParse(request.params);
    const body = createWorkOrderSchema.safeParse(request.body);
    if (!params.success || !body.success) {
      return reply.code(400).send({ error: "Bad Request", message: "Invalid WorkOrder request" });
    }

    try {
      const result = await workOrders.createForCall({ callId: params.data.callId, ...body.data });
      return reply.code(result.created ? 201 : 200).send(workOrderResponseSchema.parse({
        workOrder: serializeWorkOrder(result.workOrder),
      }));
    } catch (error) {
      if (error instanceof CallNotFoundError) {
        return reply.code(404).send({ error: "Not Found", message: error.message });
      }
      if (error instanceof CallNotEligibleError) {
        return reply.code(409).send({ error: "Conflict", message: error.message });
      }
      throw error;
    }
  });
}
