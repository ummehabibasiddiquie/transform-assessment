import { prisma } from "@/lib/db";

type TaskCopy = {
  sequence: number;
  family: string;
  title: string;
  instructions: string;
  referenceMaterial: string;
  responseType: string;
  timeLimitMin: number | null;
  aiAllowed: boolean;
  evidenceNotes: string;
};

function taskData(tasks: TaskCopy[]) {
  return tasks
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
      evidenceNotes: task.evidenceNotes,
    }));
}

export async function cloneAssessmentVersion(
  sourceId: string,
  status: "DRAFT" | "PRIVATE" | "PUBLISHED",
) {
  const source = await prisma.assessmentVersion.findUnique({
    where: { id: sourceId },
    include: { tasks: true },
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
      tasks: { create: taskData(source.tasks) },
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
  if (!published) throw new Error("No published assessment to copy.");
  return cloneAssessmentVersion(published.id, "DRAFT");
}
