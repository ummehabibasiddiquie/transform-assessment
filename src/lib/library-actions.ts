"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/access";
import { audit } from "@/lib/audit";
import { importContentLibrary } from "@/lib/library-import";
import { parseChoices } from "@/lib/question-shape";
import { importQuestionSheet, optionsJsonFor } from "@/lib/question-sheet";

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

export async function addTrack(formData: FormData) {
  const staff = await requireStaff("editAssessment");
  const roleName = String(formData.get("roleName") ?? "").trim();
  const level = String(formData.get("level") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  if (!roleName || !level || !code) {
    redirect("/console/library/configure?error=" + encodeURIComponent("Role, level, and code are required."));
  }
  await prisma.assessmentTrack.upsert({
    where: { code },
    update: { roleName, level, status: "ACTIVE" },
    create: { code, roleName, level, status: "ACTIVE" },
  });
  await audit({
    actorId: staff.userId,
    action: "ADD_TRACK",
    entity: "AssessmentTrack",
    entityId: code,
    metadata: { roleName, level },
  });
  redirect("/console/library/configure?saved=track");
}

export async function importRoleQuestions(formData: FormData) {
  const staff = await requireStaff("editAssessment");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/console/library/configure?error=" + encodeURIComponent("Choose the Excel question file."));
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    redirect("/console/library/configure?error=" + encodeURIComponent("Upload an .xlsx file."));
  }
  const mode = formData.get("mode") === "replace" ? "replace" : "add";
  const buffer = Buffer.from(await file.arrayBuffer());
  const summary = await importQuestionSheet(prisma, buffer, mode);
  await audit({
    actorId: staff.userId,
    action: "IMPORT_ROLE_QUESTIONS",
    entity: "BankItem",
    entityId: file.name,
    metadata: {
      mode,
      created: summary.created,
      updated: summary.updated,
      retired: summary.retired,
      sections: summary.sections,
      roles: summary.roles,
      errors: summary.errors.length,
    },
  });
  if (summary.created + summary.updated === 0) {
    redirect(
      "/console/library/configure?error=" +
        encodeURIComponent(summary.errors[0] ?? "No questions were imported."),
    );
  }
  const parts = [
    `${summary.created} added, ${summary.updated} updated`,
    mode === "replace" && !summary.replaceSkipped
      ? `${summary.retired} previous questions/roles removed`
      : "",
  ].filter(Boolean);
  const changed = summary.sections.length ? ` Changed: ${summary.sections.join(", ")}.` : "";
  const note = summary.replaceSkipped
    ? ` No valid questions were found, so the previous library was left unchanged. First problem: ${summary.errors[0] ?? "empty file"}`
    : summary.errors.length
      ? ` ${summary.errors.length} row(s) skipped. First problem: ${summary.errors[0]}`
      : "";
  redirect(
    "/console/library/configure?saved=" +
      encodeURIComponent(`${parts.join(", ")}.${changed}${note}`),
  );
}

export async function addBankQuestion(formData: FormData) {
  const staff = await requireStaff("editAssessment");
  const trackCode = String(formData.get("trackCode") ?? "").trim();
  const moduleName = String(formData.get("module") ?? "ROLE");
  const title = String(formData.get("title") ?? "").trim();
  const prompt = String(formData.get("prompt") ?? "").trim();
  const responseType = String(formData.get("responseType") ?? "MCQ");
  const answerKey = String(formData.get("answerKey") ?? "").trim();
  const choices = parseChoices(String(formData.get("options") ?? ""));
  if (!title || !prompt) {
    redirect("/console/library/configure?error=" + encodeURIComponent("Title and question text are required."));
  }
  const track = trackCode
    ? await prisma.assessmentTrack.findUnique({ where: { code: trackCode } })
    : null;
  if (moduleName === "ROLE" && !track) {
    redirect("/console/library/configure?error=" + encodeURIComponent("Choose a role for a role question."));
  }
  const sourceId = `MANUAL-${Date.now()}`;
  await prisma.bankItem.create({
    data: {
      sourceId,
      module: moduleName,
      trackId: moduleName === "ROLE" ? track?.id : null,
      responseType: choices.length >= 2 && responseType === "SHORT" ? "MCQ" : responseType,
      title,
      prompt,
      optionsJson: JSON.stringify(choices),
      answerKey,
      aiAllowed: formData.get("aiAllowed") === "on",
      searchAllowed: formData.get("searchAllowed") === "on",
      status: "APPROVED",
      bank: "MANUAL",
      timeLimitMin: Number(formData.get("timeLimitMin") || 2),
    },
  });
  await audit({
    actorId: staff.userId,
    action: "ADD_QUESTION",
    entity: "BankItem",
    entityId: sourceId,
    metadata: { module: moduleName, trackCode },
  });
  redirect("/console/library/configure?saved=question");
}

export async function saveBankQuestion(formData: FormData) {
  const staff = await requireStaff("editAssessment");
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const prompt = String(formData.get("prompt") ?? "").trim();
  const responseType = String(formData.get("responseType") ?? "MCQ");
  const options = String(formData.get("options") ?? "");
  const answerKey = String(formData.get("answerKey") ?? "").trim();
  if (!id || !title || !prompt) {
    redirect("/console/library/questions?error=" + encodeURIComponent("Title and question text are required."));
  }
  const item = await prisma.bankItem.findUnique({ where: { id } });
  if (!item) {
    redirect("/console/library/questions?error=" + encodeURIComponent("That question was not found."));
  }
  const choices = parseChoices(options);
  await prisma.bankItem.update({
    where: { id },
    data: {
      title,
      prompt,
      responseType,
      optionsJson: optionsJsonFor(responseType, options, choices),
      answerKey,
      competency: String(formData.get("competency") ?? "").trim(),
      difficulty: String(formData.get("difficulty") ?? "").trim(),
      timeLimitMin: Number(formData.get("timeLimitMin") || item.timeLimitMin || 2),
      aiAllowed: formData.get("aiAllowed") === "on",
      searchAllowed: formData.get("searchAllowed") === "on",
      status: String(formData.get("status") ?? "APPROVED") === "RETIRED" ? "RETIRED" : "APPROVED",
    },
  });
  await audit({
    actorId: staff.userId,
    action: "UPDATE_QUESTION",
    entity: "BankItem",
    entityId: item.sourceId,
  });
  const role =
    item.module === "ROLE"
      ? (await prisma.assessmentTrack.findUnique({ where: { id: item.trackId ?? "" } }))?.code ?? "COMMON"
      : "COMMON";
  redirect(`/console/library/questions/role/${role}?saved=1`);
}
