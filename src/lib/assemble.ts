import type { BankItem, PrismaClient } from "@prisma/client";

function targetDifficulty(level: string) {
  const text = level.toLowerCase();
  if (text.includes("manager")) return 4;
  if (text.includes("fresher") || text.includes("jr")) return 2;
  return 3;
}

function pickItems(items: BankItem[], count: number, exposed: Set<string>) {
  const groups = new Set<string>();
  const chosen: BankItem[] = [];
  function take(skipExposed: boolean) {
    for (const item of items) {
      if (chosen.length >= count) return;
      if (item.status !== "APPROVED") continue;
      if (chosen.some((picked) => picked.sourceId === item.sourceId)) continue;
      if (skipExposed && exposed.has(item.sourceId)) continue;
      if (item.equivalentGroup && groups.has(item.equivalentGroup)) continue;
      if (item.equivalentGroup) groups.add(item.equivalentGroup);
      chosen.push(item);
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
  const aptitudePreferred = aptitudePool.filter(
    (item) => item.bank === "OBJECTIVE" && !item.title.toLowerCase().includes("novel"),
  );
  const aptitude = pickItems(
    [...aptitudePreferred, ...aptitudePool.filter((item) => !aptitudePreferred.includes(item))],
    20,
    exposed,
  );
  const problemSolving = pickItems(
    byDifficulty(
      approved.filter((item) => item.module === "COMMON_PROBLEM_SOLVING"),
      track.level,
    ),
    8,
    exposed,
  );
  const rolePool = approved.filter((item) => item.module === "ROLE" && item.trackId === track.id);
  const required = rolePool
    .filter((item) => item.sourceId.startsWith("OE-FR-"))
    .sort((a, b) => a.sourceId.localeCompare(b.sourceId));
  const uploaded = rolePool
    .filter((item) => item.bank === "UPLOAD" && !item.sourceId.startsWith("OE-FR-"))
    .sort((a, b) => a.sourceId.localeCompare(b.sourceId));
  const role =
    uploaded.length > 0
      ? [...required, ...uploaded]
      : [
          ...required,
          ...pickItems(
            byDifficulty(
              rolePool.filter((item) => !item.sourceId.startsWith("OE-FR-")),
              track.level,
            ),
            track.code === "TR-OE-F" ? 0 : 12,
            exposed,
          ),
        ];
  return { aptitude, problemSolving, role };
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
  const roleLabel = `${track.roleName} — ${track.level}`;
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

  let assessment = await prisma.assessment.findFirst({
    where: { roleVersionId: roleVersion.id, name: roleLabel },
  });
  if (!assessment) {
    assessment = await prisma.assessment.create({
      data: {
        roleVersionId: roleVersion.id,
        name: roleLabel,
        durationMin: 90,
        status: "PUBLISHED",
      },
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

  for (const [index, item] of selected.entries()) {
    const common = item.module !== "ROLE";
    const task = await prisma.task.create({
      data: {
        assessmentVersionId: version.id,
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
    await prisma.questionExposure.upsert({
      where: { email_sourceId: { email: email.toLowerCase(), sourceId: item.sourceId } },
      update: {},
      create: { email: email.toLowerCase(), sourceId: item.sourceId },
    });
  }

  return version;
}
