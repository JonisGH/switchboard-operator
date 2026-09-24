import { createApp } from "./app.js";

const app = createApp();
const port = Number(process.env.PORT ?? 3001);

try {
  await app.listen({ port, host: "127.0.0.1" });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
