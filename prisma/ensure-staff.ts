import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STAFF = [
  { name: "Aisha Rahman", email: "ivan.p@example.net", role: "ADMIN" },
  { name: "Neel Joshi", email: "zara.a@example.net", role: "DESIGNER" },
  { name: "Meera Kapoor", email: "ivan.p@example.net", role: "EVALUATOR" },
  { name: "Arjun Desai", email: "maria.s@example.com", role: "HIRING_MANAGER" },
];

async function main() {
  const passwordHash = await bcrypt.hash("transform123", 10);
  for (const person of STAFF) {
    await prisma.user.upsert({
      where: { email: person.email },
      update: { name: person.name, role: person.role, passwordHash, active: true },
      create: { ...person, passwordHash },
    });
    console.log("Ready:", person.email, person.role);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
