import type { BankItem, PrismaClient } from "@prisma/client";
import { TEST_DURATION_MIN } from "./invite-email";

function targetDifficulty(level: string) {
  const text = level.toLowerCase();
  if (text.includes("manager")) return 4;
  if (text.includes("fresher") || text.includes("jr")) return 2;
  return 3;
}

function itemMinutes(item: BankItem) {
  if (item.timeLimitMin && item.timeLimitMin > 0) return item.timeLimitMin;
  if (item.responseType === "PRACTICAL") return 8;
  if (item.responseType === "SHORT") return 3;
  return 2;
}

function pickUntilMinutes(items: BankItem[], maxMinutes: number, exposed: Set<string>) {
  const groups = new Set<string>();
  const chosen: BankItem[] = [];
  let used = 0;
  function take(skipExposed: boolean) {
    for (const item of items) {
      if (used >= maxMinutes) return;
      if (item.status !== "APPROVED") continue;
      if (chosen.some((picked) => picked.sourceId === item.sourceId)) continue;
      if (skipExposed && exposed.has(item.sourceId)) continue;
      if (item.equivalentGroup && groups.has(item.equivalentGroup)) continue;
      const mins = itemMinutes(item);
      if (chosen.length > 0 && used + mins > maxMinutes) continue;
      if (item.equivalentGroup) groups.add(item.equivalentGroup);
      chosen.push(item);
      used += mins;
    }
  }
  take(true);
  take(false);
  return chosen;
}

function byDifficulty(items: BankItem[], level: string) {
  const target = targetDifficulty(level);
  return [...items].sort((a, b) => {
    const left = Math.abs((Number(a.difficulty) || 3) - target);
    const right = Math.abs((Number(b.difficulty) || 3) - target);
    return left - right || a.sourceId.localeCompare(b.sourceId);
  });
}

export function planTrackItems(
  track: { id: string; code: string; level: string },
  items: BankItem[],
  exposed: Set<string>,
) {
  const approved = items.filter((item) => item.status === "APPROVED");
  const aptitudePool = byDifficulty(
    approved.filter((item) => item.module === "COMMON_APTITUDE"),
    track.level,
  );
  const aptitudeUploaded = aptitudePool.filter((item) => item.bank === "UPLOAD");
  const aptitudePreferred = aptitudePool.filter(
    (item) => item.bank === "OBJECTIVE" && !item.title.toLowerCase().includes("novel"),
  );
  const aptitudeSource =
    aptitudeUploaded.length > 0
      ? aptitudeUploaded
      : aptitudePreferred.length > 0
        ? aptitudePreferred
        : aptitudePool;
  const aptitude = pickUntilMinutes(aptitudeSource, 15, exposed);
  const problemSolvingPool = byDifficulty(
    approved.filter((item) => item.module === "COMMON_PROBLEM_SOLVING"),
    track.level,
  );
  const problemSolvingUploaded = problemSolvingPool.filter((item) => item.bank === "UPLOAD");
  const problemSolvingSource =
    problemSolvingUploaded.length > 0 ? problemSolvingUploaded : problemSolvingPool;
  const problemSolving = pickUntilMinutes(problemSolvingSource, 15, exposed);
  const rolePool = approved.filter((item) => item.module === "ROLE" && item.trackId === track.id);
  const uploaded = rolePool
    .filter((item) => item.bank === "UPLOAD")
    .sort((a, b) => a.sourceId.localeCompare(b.sourceId));
  const roleSource = uploaded.length > 0 ? uploaded : byDifficulty(rolePool, track.level);
  const role = pickUntilMinutes(roleSource, 30, exposed);
  return { aptitude, problemSolving, role };
}

export function trackRoleLabel(track: { roleName: string; level: string }) {
  return `${track.roleName} — ${track.level}`;
}

export async function ensureRoleVersionForTrack(
  prisma: PrismaClient,
  track: {
    roleName: string;
    level: string;
    parentProfile: string;
    competencies: string;
  },
) {
  const roleLabel = trackRoleLabel(track);
  let roleRecord = await prisma.role.findFirst({ where: { name: roleLabel } });
  if (!roleRecord) {
    roleRecord = await prisma.role.create({
      data: {
        name: roleLabel,
        purpose: track.parentProfile || track.roleName,
        status: "ACTIVE",
      },
    });
  }

  let roleVersion = await prisma.roleVersion.findFirst({
    where: { roleId: roleRecord.id, status: "PUBLISHED" },
    include: { competencies: true },
    orderBy: { version: "desc" },
  });
  if (!roleVersion) {
    roleVersion = await prisma.roleVersion.create({
      data: {
        roleId: roleRecord.id,
        version: 1,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
      include: { competencies: true },
    });
  }
  if (roleVersion.competencies.length === 0) {
    const names = track.competencies
      .split(/[;,]/)
      .map((name) => name.trim())
      .filter(Boolean);
    const list = names.length > 0 ? names : ["Problem solving", "Judgement", "Communication"];
    const weight = Math.round((100 / list.length) * 10) / 10;
    await prisma.competency.createMany({
      data: list.map((name, index) => ({
        roleVersionId: roleVersion!.id,
        name,
        definition: name,
        weight,
        sortOrder: index + 1,
        exceptional: "Clear, accurate evidence with sound judgement.",
        acceptable: "Meets the expected level with manageable gaps.",
        poor: "Incomplete, unsafe, or unsupported response.",
      })),
    });
  }
  return roleVersion;
}

export async function writeItemsAsTasks(
  prisma: PrismaClient,
  versionId: string,
  items: BankItem[],
  email?: string,
) {
  for (const [index, item] of items.entries()) {
    const common = item.module !== "ROLE";
    const task = await prisma.task.create({
      data: {
        assessmentVersionId: versionId,
        sequence: index + 1,
        family: item.responseType === "PRACTICAL" ? "CUSTOM" : "Q",
        title: item.title,
        instructions: item.prompt,
        referenceMaterial: "",
        responseType: item.responseType,
        timeLimitMin: item.timeLimitMin,
        aiAllowed: common ? false : item.aiAllowed,
        searchAllowed: common ? false : item.searchAllowed,
        evidenceNotes: "",
        module: item.module,
        optionsJson: item.optionsJson,
        competencyName: item.competency,
        sourceId: item.sourceId,
        isGate: item.isGate,
      },
    });
    await prisma.taskKey.create({
      data: {
        taskId: task.id,
        answerKey: item.answerKey,
        rubric: item.rubric,
        evidence: item.evidence,
      },
    });
    if (email && item.sourceId) {
      await prisma.questionExposure.upsert({
        where: { email_sourceId: { email: email.toLowerCase(), sourceId: item.sourceId } },
        update: {},
        create: { email: email.toLowerCase(), sourceId: item.sourceId },
      });
    }
  }
}

export async function assembleTrackPaper(prisma: PrismaClient, trackCode: string, email: string) {
  const track = await prisma.assessmentTrack.findUnique({ where: { code: trackCode } });
  if (!track || track.status !== "ACTIVE") {
    throw new Error("Choose an active role and level.");
  }

  const exposedRows = await prisma.questionExposure.findMany({
    where: { email: email.toLowerCase() },
    select: { sourceId: true },
  });
  const exposed = new Set(exposedRows.map((row) => row.sourceId));
  const items = await prisma.bankItem.findMany({ where: { status: "APPROVED" } });
  const { aptitude, problemSolving, role } = planTrackItems(track, items, exposed);

  if (aptitude.length === 0 || problemSolving.length === 0 || role.length === 0) {
    throw new Error("This role does not have approved common and role questions yet.");
  }

  const selected = [...aptitude, ...problemSolving, ...role];
  const roleLabel = trackRoleLabel(track);
  const roleVersion = await ensureRoleVersionForTrack(prisma, track);

  let assessment = await prisma.assessment.findFirst({
    where: { roleVersionId: roleVersion.id, name: roleLabel },
  });
  if (!assessment) {
    assessment = await prisma.assessment.create({
      data: {
        roleVersionId: roleVersion.id,
        name: roleLabel,
        durationMin: TEST_DURATION_MIN,
        status: "PUBLISHED",
      },
    });
  } else if (assessment.durationMin !== TEST_DURATION_MIN) {
    assessment = await prisma.assessment.update({
      where: { id: assessment.id },
      data: { durationMin: TEST_DURATION_MIN },
    });
  }
  const latest = await prisma.assessmentVersion.findFirst({
    where: { assessmentId: assessment.id },
    orderBy: { version: "desc" },
  });
  const version = await prisma.assessmentVersion.create({
    data: {
      assessmentId: assessment.id,
      version: (latest?.version ?? 0) + 1,
      status: "PUBLISHED",
      publishedAt: new Date(),
      instructions: `This assessment has three parts: aptitude and reasoning, problem solving, then tasks for ${roleLabel}. Answer keys are not shown. Save as you go.`,
      aiPolicy: track.aiPolicy || "Follow the permission shown on each task.",
      criticalGates: track.criticalGates,
    },
  });

  await writeItemsAsTasks(prisma, version.id, selected, email);
  return version;
}
