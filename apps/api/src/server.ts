import "dotenv/config";
import { createApp } from "./app.js";
import { createCallReader } from "./calls/repository.js";
import { createPrismaClient } from "./db.js";
import { createWorkOrderStore } from "./work-orders/repository.js";
import { createWorkOrderService } from "./work-orders/service.js";

const prisma = createPrismaClient();
const app = createApp(createCallReader(prisma), createWorkOrderService(createWorkOrderStore(prisma)));
app.addHook("onClose", async () => prisma.$disconnect());
const port = Number(process.env.PORT ?? 3001);

try {
  await app.listen({ port, host: "127.0.0.1" });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
