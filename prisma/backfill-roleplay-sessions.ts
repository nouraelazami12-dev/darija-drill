import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const messages = await prisma.chatMessage.findMany({
    where: { sessionId: null },
    select: { id: true, scenarioId: true },
  });

  const scenarioIds = [...new Set(messages.map((m) => m.scenarioId))];

  for (const scenarioId of scenarioIds) {
    const session = await prisma.roleplaySession.create({
      data: { scenarioId, scriptFormat: "arabizi" },
    });
    const { count } = await prisma.chatMessage.updateMany({
      where: { scenarioId, sessionId: null },
      data: { sessionId: session.id },
    });
    console.log(`scenario ${scenarioId}: created session ${session.id}, backfilled ${count} messages`);
  }

  if (scenarioIds.length === 0) {
    console.log("No orphaned messages found — nothing to backfill.");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
