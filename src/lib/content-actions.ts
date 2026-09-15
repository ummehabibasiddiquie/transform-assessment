"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireStaff } from "@/lib/access";
import { cloneAssessmentVersion, getOrCreateDraft } from "@/lib/versioning";

async function staffOrLogin() {
  return requireStaff("editAssessment");
}

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function startTemplateDraft(assessmentId: string) {
  const staff = await staffOrLogin();
  const draft = await getOrCreateDraft(assessmentId);
  await audit({
    actorId: staff.userId,
    action: "START_DRAFT",
    entity: "AssessmentVersion",
    entityId: draft.id,
  });
  redirect("/console/assessment");
}

export async function publishDraft(versionId: string) {
  const staff = await staffOrLogin();
  const version = await prisma.assessmentVersion.findUnique({
    where: { id: versionId },
    include: { tasks: true },
  });
  if (!version || version.status !== "DRAFT") {
    throw new Error("Only a draft can be published.");
  }
  if (version.tasks.length === 0) {
    throw new Error("Add at least one task before publishing.");
  }

  await prisma.assessmentVersion.updateMany({
    where: { assessmentId: version.assessmentId, status: "PUBLISHED" },
    data: { status: "ARCHIVED" },
  });
  await prisma.assessmentVersion.update({
    where: { id: versionId },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
  await audit({
    actorId: staff.userId,
    action: "PUBLISH_ASSESSMENT",
    entity: "AssessmentVersion",
    entityId: versionId,
  });
  revalidatePath("/console/assessment");
  redirect("/console/assessment");
}

export async function saveVersionCopy(formData: FormData) {
  const staff = await staffOrLogin();
  const versionId = field(formData, "versionId");
  const version = await prisma.assessmentVersion.findUnique({ where: { id: versionId } });
  if (!version || (version.status !== "DRAFT" && version.status !== "PRIVATE")) {
    throw new Error("This version is locked.");
  }
  await prisma.assessmentVersion.update({
    where: { id: versionId },
    data: {
      instructions: field(formData, "instructions"),
      aiPolicy: field(formData, "aiPolicy"),
    },
  });
  await prisma.assessment.update({
    where: { id: version.assessmentId },
    data: { durationMin: Number(formData.get("durationMin") || 90) },
  });
  await audit({
    actorId: staff.userId,
    action: "SAVE_ASSESSMENT_COPY",
    entity: "AssessmentVersion",
    entityId: versionId,
  });
  revalidatePath("/console/assessment");
}

export async function saveTask(formData: FormData) {
  const staff = await staffOrLogin();
  const taskId = field(formData, "taskId");
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assessmentVersion: true },
  });
  if (!task) throw new Error("Task not found.");
  if (
    task.assessmentVersion.status !== "DRAFT" &&
    task.assessmentVersion.status !== "PRIVATE"
  ) {
    throw new Error("Publish a new version if you need to change the shared paper.");
  }

  await prisma.task.update({
    where: { id: taskId },
    data: {
      title: field(formData, "title") || "Untitled task",
      family: field(formData, "family") || "CUSTOM",
      instructions: field(formData, "instructions"),
      referenceMaterial: field(formData, "referenceMaterial"),
      evidenceNotes: field(formData, "evidenceNotes"),
      timeLimitMin: Number(formData.get("timeLimitMin") || 0) || null,
      aiAllowed: formData.get("aiAllowed") === "on",
      responseType: "STRUCTURED",
    },
  });
  await audit({
    actorId: staff.userId,
    action: "SAVE_TASK",
    entity: "Task",
    entityId: taskId,
  });

  const candidateId = field(formData, "candidateId");
  redirect(
    candidateId
      ? `/console/candidates/${candidateId}/tasks`
      : "/console/assessment",
  );
}

export async function createTask(formData: FormData) {
  const staff = await staffOrLogin();
  const versionId = field(formData, "versionId");
  const candidateId = field(formData, "candidateId");
  const version = await prisma.assessmentVersion.findUnique({
    where: { id: versionId },
    include: { tasks: true },
  });
  if (!version || (version.status !== "DRAFT" && version.status !== "PRIVATE")) {
    throw new Error("This version is locked.");
  }
  const nextSequence =
    version.tasks.reduce((max, task) => Math.max(max, task.sequence), 0) + 1;
  const task = await prisma.task.create({
    data: {
      assessmentVersionId: versionId,
      sequence: nextSequence,
      family: field(formData, "family") || "CUSTOM",
      title: field(formData, "title") || "New task",
      instructions: field(formData, "instructions") || "Write the candidate instructions.",
      referenceMaterial: field(formData, "referenceMaterial"),
      evidenceNotes: field(formData, "evidenceNotes"),
      timeLimitMin: Number(formData.get("timeLimitMin") || 15) || 15,
      aiAllowed: formData.get("aiAllowed") === "on",
      responseType: "STRUCTURED",
    },
  });
  await audit({
    actorId: staff.userId,
    action: "CREATE_TASK",
    entity: "Task",
    entityId: task.id,
  });
  redirect(
    candidateId
      ? `/console/candidates/${candidateId}/tasks/${task.id}`
      : `/console/assessment/tasks/${task.id}`,
  );
}

export async function deleteTask(formData: FormData) {
  const staff = await staffOrLogin();
  const taskId = field(formData, "taskId");
  const candidateId = field(formData, "candidateId");
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assessmentVersion: true },
  });
  if (!task) throw new Error("Task not found.");
  if (
    task.assessmentVersion.status !== "DRAFT" &&
    task.assessmentVersion.status !== "PRIVATE"
  ) {
    throw new Error("This version is locked.");
  }
  const versionId = task.assessmentVersionId;
  await prisma.task.delete({ where: { id: taskId } });
  const remaining = await prisma.task.findMany({
    where: { assessmentVersionId: versionId },
    orderBy: { sequence: "asc" },
  });
  for (const [index, item] of remaining.entries()) {
    await prisma.task.update({
      where: { id: item.id },
      data: { sequence: index + 1 },
    });
  }
  await audit({
    actorId: staff.userId,
    action: "DELETE_TASK",
    entity: "Task",
    entityId: taskId,
  });
  redirect(
    candidateId
      ? `/console/candidates/${candidateId}/tasks`
      : "/console/assessment",
  );
}

export async function customizeCandidatePaper(candidateId: string) {
  const staff = await staffOrLogin();
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: {
      invites: { orderBy: { createdAt: "desc" }, take: 1 },
      attempts: { orderBy: { startedAt: "desc" }, take: 1 },
    },
  });
  const invite = candidate?.invites[0];
  if (!candidate || !invite) throw new Error("Invite this candidate first.");
  if (candidate.attempts[0]?.status === "SUBMITTED") {
    throw new Error("This paper is locked because the candidate already submitted.");
  }
  if (candidate.attempts.length > 0) {
    throw new Error("This candidate has already started. Customize before they begin.");
  }

  const current = await prisma.assessmentVersion.findUnique({
    where: { id: invite.assessmentVersionId },
  });
  if (current?.status === "PRIVATE") {
    redirect(`/console/candidates/${candidateId}/tasks`);
  }

  const privateVersion = await cloneAssessmentVersion(
    invite.assessmentVersionId,
    "PRIVATE",
  );
  await prisma.invite.update({
    where: { id: invite.id },
    data: { assessmentVersionId: privateVersion.id },
  });
  await audit({
    actorId: staff.userId,
    action: "CUSTOMIZE_CANDIDATE_PAPER",
    entity: "Candidate",
    entityId: candidateId,
    metadata: { versionId: privateVersion.id },
  });
  redirect(`/console/candidates/${candidateId}/tasks`);
}
