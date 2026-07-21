import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_SCENARIOS = [
  {
    name: "Taxi ride",
    description:
      "You flag down a petit taxi in the city and need to tell the driver where you're going, agree on the fare, and make small talk during the ride.",
  },
  {
    name: "Hanoot (corner shop)",
    description:
      "You stop at the neighborhood hanoot to buy a few small items — bread, eggs, water — and chat briefly with the shopkeeper.",
  },
  {
    name: "Café order",
    description:
      "You sit down at a Moroccan café and order coffee or tea from the waiter, maybe asking for a recommendation.",
  },
  {
    name: "Meeting a friend's family",
    description:
      "Your friend introduces you to their family at their home. You exchange greetings, answer polite questions about yourself, and make a good impression.",
  },
  {
    name: "Haggling at the market",
    description:
      "You're browsing a souk stall and want to negotiate the price of an item you like — a bit of back-and-forth haggling with the seller.",
  },
];

async function main() {
  for (const scenario of DEFAULT_SCENARIOS) {
    const existing = await prisma.scenario.findFirst({ where: { name: scenario.name } });
    if (!existing) {
      await prisma.scenario.create({ data: { ...scenario, isCustom: false } });
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
