import { readFileSync } from "fs";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";
import { importContentLibrary } from "../src/lib/library-import";

const prisma = new PrismaClient();

async function main() {
  const file =
    process.argv[2] ??
    resolve(process.cwd(), "content/TRANSFORM_Master_Assessment_Content_Library_V2.xlsx");
  const buffer = readFileSync(file);
  const summary = await importContentLibrary(prisma, buffer, {
    fileName: file.split(/[/\\]/).pop() ?? file,
  });
  console.log("Imported", summary.fileName);
  console.log(summary.counts);
  if (summary.errors.length) {
    console.log("Warnings:");
    for (const error of summary.errors) console.log("-", error);
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
