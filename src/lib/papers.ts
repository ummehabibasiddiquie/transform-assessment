import type { PrismaClient } from "@prisma/client";
import {
  ensureRoleVersionForTrack,
  planTrackItems,
  trackRoleLabel,
  writeItemsAsTasks,
} from "@/lib/assemble";
import { TEST_DURATION_MIN } from "@/lib/invite-email";

export const CUSTOM_PAPER_ROLE = "Custom paper";

export function isStaffPaper(name: string, roleName: string) {
  if (roleName === CUSTOM_PAPER_ROLE) return true;
  const title = name.trim();
  const role = roleName.trim();
  if (/work simulation/i.test(title)) return false;
  return title.length > 0 && title !== role;
}

export function designerUrl(trackCode?: string, paperId?: string, extra?: string, versionId?: string) {
  const params = new URLSearchParams();
  if (trackCode) params.set("role", trackCode);
  if (paperId) params.set("paper", paperId);
  if (versionId) params.set("version", versionId);
  if (extra) params.set("saved", extra);
  const query = params.toString();
  return query ? `/console/assessment?${query}` : "/console/assessment";
}

export async function publishedPapersForDesigner(
  prisma: PrismaClient,
  tracks: { code: string; roleName: string; level: string }[],
) {
  const versions = await prisma.assessmentVersion.findMany({
    where: { status: "PUBLISHED" },
    include: {
      assessment: { include: { roleVersion: { include: { role: true } } } },
      tasks: { select: { id: true } },
    },
    orderBy: [{ publishedAt: "desc" }, { version: "desc" }],
  });
  return versions
    .filter((item) => item.tasks.length > 0)
    .filter((item) => isStaffPaper(item.assessment.name, item.assessment.roleVersion.role.name))
    .map((item) => {
      const roleName = item.assessment.roleVersion.role.name;
      const track = tracks.find((row) => trackRoleLabel(row) === roleName);
      const previous = item.status === "ARCHIVED" ? " (previous)" : "";
      const roleBit = roleName === CUSTOM_PAPER_ROLE ? "custom" : roleName;
      return {
        go: `paper:${item.assessmentId}:${item.id}`,
        paperId: item.assessmentId,
        versionId: item.id,
        trackCode: track?.code,
        label: `${item.assessment.name} · ${roleBit} · v${item.version}${previous}`,
      };
    });
}

export async function ensureCustomRoleVersion(prisma: PrismaClient) {
  let roleRecord = await prisma.role.findFirst({ where: { name: CUSTOM_PAPER_ROLE } });
  if (!roleRecord) {
    roleRecord = await prisma.role.create({
      data: {
        name: CUSTOM_PAPER_ROLE,
        purpose: "Papers written from scratch, not tied to a hiring role.",
        status: "ACTIVE",
      },
    });
  }
  let roleVersion = await prisma.roleVersion.findFirst({
    where: { roleId: roleRecord.id, status: "PUBLISHED" },
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
    });
  }
  return roleVersion;
}

export async function customPapers(prisma: PrismaClient) {
  const roleVersion = await prisma.roleVersion.findFirst({
    where: { role: { name: CUSTOM_PAPER_ROLE }, status: "PUBLISHED" },
    orderBy: { version: "desc" },
    include: {
      assessments: {
        include: {
          versions: { include: { tasks: true }, orderBy: { version: "desc" } },
        },
      },
    },
  });
  return roleVersion?.assessments ?? [];
}

export async function createBlankPaper(prisma: PrismaClient, title: string) {
  const name = title.trim();
  if (!name) throw new Error("Give the paper a title.");
  const roleVersion = await ensureCustomRoleVersion(prisma);
  const assessment = await prisma.assessment.create({
    data: {
      roleVersionId: roleVersion.id,
      name,
      durationMin: TEST_DURATION_MIN,
      status: "PUBLISHED",
    },
  });
  await prisma.assessmentVersion.create({
    data: {
      assessmentId: assessment.id,
      version: 1,
      status: "DRAFT",
      instructions: `Answer the questions for ${name}. Save as you go. Answer keys are not shown.`,
      aiPolicy: "Follow the permission shown on each task.",
    },
  });
  return assessment;
}

export async function papersForTrack(prisma: PrismaClient, trackCode: string) {
  const track = await prisma.assessmentTrack.findUnique({ where: { code: trackCode } });
  if (!track) return [];
  const roleVersion = await prisma.roleVersion.findFirst({
    where: { role: { name: trackRoleLabel(track) }, status: "PUBLISHED" },
    orderBy: { version: "desc" },
    include: {
      assessments: {
        include: {
          versions: { include: { tasks: true }, orderBy: { version: "desc" } },
        },
      },
    },
  });
  return (roleVersion?.assessments ?? []).filter((paper) =>
    isStaffPaper(paper.name, trackRoleLabel(track)),
  );
}

export async function createNamedPaper(prisma: PrismaClient, trackCode: string, title: string) {
  const track = await prisma.assessmentTrack.findUnique({ where: { code: trackCode } });
  if (!track || track.status !== "ACTIVE") {
    throw new Error("Choose an active role and level.");
  }
  const name = title.trim() || trackRoleLabel(track);
  const roleVersion = await ensureRoleVersionForTrack(prisma, track);
  const assessment = await prisma.assessment.create({
    data: {
      roleVersionId: roleVersion.id,
      name,
      durationMin: track.durationMin || TEST_DURATION_MIN,
      status: "PUBLISHED",
    },
  });
  const version = await prisma.assessmentVersion.create({
    data: {
      assessmentId: assessment.id,
      version: 1,
      status: "DRAFT",
      instructions: `Answer the questions for ${name}. Save as you go. Answer keys are not shown.`,
      aiPolicy: track.aiPolicy || "Follow the permission shown on each task.",
      criticalGates: track.criticalGates,
    },
  });
  const items = await prisma.bankItem.findMany({ where: { status: "APPROVED" } });
  const plan = planTrackItems(track, items, new Set());
  let selected = [...plan.aptitude, ...plan.problemSolving, ...plan.role];
  if (selected.length === 0) {
    selected = items.filter((item) => item.module === "ROLE" && item.trackId === track.id);
  }
  await writeItemsAsTasks(prisma, version.id, selected);
  return { assessment, version };
}

export async function publishedPapersForInvite(prisma: PrismaClient) {
  const versions = await prisma.assessmentVersion.findMany({
    where: { status: "PUBLISHED" },
    include: {
      assessment: { include: { roleVersion: { include: { role: true } } } },
      tasks: { select: { id: true } },
    },
    orderBy: [{ publishedAt: "desc" }, { version: "desc" }],
  });
  const latest = new Map<string, (typeof versions)[number]>();
  for (const version of versions) {
    if (version.tasks.length === 0) continue;
    if (!isStaffPaper(version.assessment.name, version.assessment.roleVersion.role.name)) continue;
    const current = latest.get(version.assessmentId);
    if (!current || version.version > current.version) {
      latest.set(version.assessmentId, version);
    }
  }
  return [...latest.values()].map((version) => {
    const roleName = version.assessment.roleVersion.role.name;
    const roleBit = roleName === CUSTOM_PAPER_ROLE ? "custom" : roleName;
    return {
      value: version.id,
      label: `${version.assessment.name} · ${roleBit} · v${version.version} · ${version.tasks.length} questions`,
    };
  });
}
