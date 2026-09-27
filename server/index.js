import { createApp } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./lib/prisma.js";

const app = createApp();

const server = app.listen(config.PORT, () => {
  console.log(`PHSecure API listening on http://localhost:${config.PORT}`);
  if (config.devOutbox) {
    console.log(`Brevo not configured → emails & SMS go to the dev outbox: ${config.clientUrl}/api/dev/outbox`);
  }
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
