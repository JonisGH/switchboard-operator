import "dotenv/config";
import { createPrismaClient } from "../src/db.js";
import { createWorkOrderStore } from "../src/work-orders/repository.js";
import { createWorkOrderService } from "../src/work-orders/service.js";

const prisma = createPrismaClient();
const now = Date.now();
const minutesAgo = (minutes: number) => new Date(now - minutes * 60_000);

try {
  const result = await prisma.call.createMany({
    skipDuplicates: true,
    data: [
      { id: "11111111-1111-4111-8111-111111111111", callerReference: "Demo Caller 001", category: "OPENING_HOURS", outcome: "AI_RESOLVED", startedAt: minutesAgo(150), endedAt: minutesAgo(148) },
      { id: "22222222-2222-4222-8222-222222222222", callerReference: "Demo Caller 002", category: "DELIVERY_ISSUE", outcome: "HUMAN_ACTION_REQUIRED", startedAt: minutesAgo(105), endedAt: minutesAgo(100) },
      { id: "33333333-3333-4333-8333-333333333333", callerReference: "Demo Caller 003", category: "CALLBACK_REQUEST", outcome: "TRANSFERRED", startedAt: minutesAgo(70), endedAt: minutesAgo(67) },
      { id: "44444444-4444-4444-8444-444444444444", callerReference: null, category: "SERVICE_INFORMATION", outcome: "INCOMPLETE", startedAt: minutesAgo(35), endedAt: minutesAgo(34) },
      { id: "55555555-5555-4555-8555-555555555555", callerReference: "Demo Caller 005", category: null, outcome: null, startedAt: minutesAgo(5), endedAt: null },
    ],
  });
  console.log(`Added ${result.count} fictional calls (existing seed records were preserved).`);
  const { created } = await createWorkOrderService(createWorkOrderStore(prisma)).createForCall({
    callId: "22222222-2222-4222-8222-222222222222",
    title: "Follow up on missing delivery",
    description: "Fictional caller reports that a delivery has not arrived. Check the order and contact the caller.",
  });
  console.log(created ? "Added 1 fictional WorkOrder." : "Fictional WorkOrder already exists.");
} finally {
  await prisma.$disconnect();
}
