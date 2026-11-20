import { prisma } from "@/lib/db";

export async function cloneAssessmentVersion(
  sourceId: string,
  status: "DRAFT" | "PRIVATE" | "PUBLISHED",
) {
  const source = await prisma.assessmentVersion.findUnique({
    where: { id: sourceId },
    include: { tasks: { include: { key: true } } },
  });
  if (!source) throw new Error("Assessment version not found.");

  const latest = await prisma.assessmentVersion.findFirst({
    where: { assessmentId: source.assessmentId },
    orderBy: { version: "desc" },
  });

  return prisma.assessmentVersion.create({
    data: {
      assessmentId: source.assessmentId,
      version: (latest?.version ?? 0) + 1,
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
      instructions: source.instructions,
      aiPolicy: source.aiPolicy,
      criticalGates: source.criticalGates,
      tasks: {
        create: source.tasks
          .slice()
          .sort((a, b) => a.sequence - b.sequence)
          .map((task, index) => ({
            sequence: index + 1,
            family: task.family,
            title: task.title,
            instructions: task.instructions,
            referenceMaterial: task.referenceMaterial,
            responseType: task.responseType,
            timeLimitMin: task.timeLimitMin,
            aiAllowed: task.aiAllowed,
            searchAllowed: task.searchAllowed,
            evidenceNotes: task.evidenceNotes,
            module: task.module,
            optionsJson: task.optionsJson,
            competencyName: task.competencyName,
            sourceId: task.sourceId,
            isGate: task.isGate,
            key: task.key
              ? {
                  create: {
                    answerKey: task.key.answerKey,
                    rubric: task.key.rubric,
                    evidence: task.key.evidence,
                  },
                }
              : undefined,
          })),
      },
    },
    include: { tasks: { orderBy: { sequence: "asc" } } },
  });
}

export async function getOrCreateDraft(assessmentId: string) {
  const draft = await prisma.assessmentVersion.findFirst({
    where: { assessmentId, status: "DRAFT" },
    include: { tasks: { orderBy: { sequence: "asc" } } },
    orderBy: { version: "desc" },
  });
  if (draft) return draft;

  const published = await prisma.assessmentVersion.findFirst({
    where: { assessmentId, status: "PUBLISHED" },
    orderBy: { version: "desc" },
  });
  if (!published) throw new Error("Publish a first version before starting another.");
  return cloneAssessmentVersion(published.id, "DRAFT");
}
