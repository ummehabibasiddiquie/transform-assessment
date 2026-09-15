"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/access";
import { audit } from "@/lib/audit";
import { importContentLibrary } from "@/lib/library-import";

export async function importLibraryFile(formData: FormData) {
  const staff = await requireStaff("editAssessment");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/console/library?error=" + encodeURIComponent("Choose the Excel library file."));
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    redirect("/console/library?error=" + encodeURIComponent("Upload the .xlsx content library."));
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const summary = await importContentLibrary(prisma, buffer, {
    fileName: file.name,
    importedById: staff.userId,
  });
  await audit({
    actorId: staff.userId,
    action: "IMPORT_LIBRARY",
    entity: "LibraryImport",
    entityId: summary.fileName,
    metadata: { counts: summary.counts, errors: summary.errors.length },
  });
  redirect("/console/library?imported=1");
}
