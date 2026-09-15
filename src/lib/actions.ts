"use server";

import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import {
  clearStaffSession,
  getStaffSession,
  setCandidateSession,
  setStaffSession,
} from "@/lib/auth";
import { recommendationFromScore, weightedScore } from "@/lib/scoring";

export async function loginStaff(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) {
    return { error: "Those details do not match a staff account." };
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return { error: "Those details do not match a staff account." };
  }
  await setStaffSession({
    type: "staff",
    userId: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
  });
  await audit({
    actorId: user.id,
    action: "LOGIN",
    entity: "User",
    entityId: user.id,
  });
  redirect("/console");
}

export async function logoutStaff() {
  await clearStaffSession();
  redirect("/login");
}

export async function inviteCandidate(formData: FormData) {
  const staff = await getStaffSession();
  if (!staff) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const requestedVersionId = String(formData.get("assessmentVersionId") ?? "");
  if (!name || !email) {
    throw new Error("Name and email are required.");
  }

  const assessmentVersion = requestedVersionId
    ? await prisma.assessmentVersion.findUnique({ where: { id: requestedVersionId } })
    : await prisma.assessmentVersion.findFirst({
        where: { status: "PUBLISHED" },
        orderBy: { version: "desc" },
      });
  if (!assessmentVersion || assessmentVersion.status !== "PUBLISHED") {
    throw new Error("Choose a published assessment version.");
  }

  const candidate = await prisma.candidate.create({
    data: { name, email, status: "INVITED" },
  });
  const token = randomBytes(18).toString("hex");
  const invite = await prisma.invite.create({
    data: {
      candidateId: candidate.id,
      assessmentVersionId: assessmentVersion.id,
      token,
    },
  });
  await audit({
    actorId: staff.userId,
    action: "INVITE_CANDIDATE",
    entity: "Candidate",
    entityId: candidate.id,
    metadata: { inviteId: invite.id, email },
  });
  redirect(`/console/candidates/${candidate.id}`);
}

export async function startAttempt(token: string) {
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { candidate: true, attempts: true },
  });
  if (!invite) throw new Error("This assessment link is not valid.");

  const existing = invite.attempts[0];
  if (existing?.status === "SUBMITTED") {
    await setCandidateSession({
      type: "candidate",
      candidateId: invite.candidateId,
      inviteToken: token,
      attemptId: existing.id,
    });
    redirect(`/a/${token}/done`);
  }

  const attempt =
    existing ??
    (await prisma.attempt.create({
      data: {
        candidateId: invite.candidateId,
        assessmentVersionId: invite.assessmentVersionId,
        inviteId: invite.id,
        status: "IN_PROGRESS",
      },
    }));

  await prisma.candidate.update({
    where: { id: invite.candidateId },
    data: { status: "IN_PROGRESS" },
  });
  await setCandidateSession({
    type: "candidate",
    candidateId: invite.candidateId,
    inviteToken: token,
    attemptId: attempt.id,
  });
  await audit({
    action: "START_ATTEMPT",
    entity: "Attempt",
    entityId: attempt.id,
    metadata: { candidateId: invite.candidateId },
  });
  redirect(`/a/${token}/t/${attempt.currentTaskSequence || 1}`);
}

export async function submitAttempt(token: string) {
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: {
      attempts: { include: { responses: true } },
      assessmentVersion: { include: { tasks: true } },
    },
  });
  const attempt = invite?.attempts[0];
  if (!invite || !attempt) throw new Error("Attempt not found.");
  if (attempt.status === "SUBMITTED") redirect(`/a/${token}/done`);

  await prisma.attempt.update({
    where: { id: attempt.id },
    data: { status: "SUBMITTED", submittedAt: new Date() },
  });
  await prisma.candidate.update({
    where: { id: invite.candidateId },
    data: { status: "COMPLETED" },
  });
  await audit({
    action: "SUBMIT_ATTEMPT",
    entity: "Attempt",
    entityId: attempt.id,
  });
  redirect(`/a/${token}/done`);
}

export async function saveEvaluation(formData: FormData) {
  const staff = await getStaffSession();
  if (!staff) redirect("/login");

  const attemptId = String(formData.get("attemptId") ?? "");
  const candidateId = String(formData.get("candidateId") ?? "");
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      assessmentVersion: {
        include: {
          assessment: {
            include: { roleVersion: { include: { competencies: true } } },
          },
        },
      },
    },
  });
  if (!attempt) throw new Error("Attempt not found.");

  const competencies =
    attempt.assessmentVersion.assessment.roleVersion.competencies;
  const ratings: { weight: number; score: number }[] = [];

  for (const competency of competencies) {
    const score = Number(formData.get(`score-${competency.id}`));
    const rationale = String(formData.get(`rationale-${competency.id}`) ?? "");
    if (!score || score < 1 || score > 5) {
      throw new Error(`Give ${competency.name} a score from 1 to 5.`);
    }
    ratings.push({ weight: competency.weight, score });
    await prisma.humanEvaluation.upsert({
      where: {
        attemptId_competencyId: {
          attemptId,
          competencyId: competency.id,
        },
      },
      create: {
        attemptId,
        competencyId: competency.id,
        score,
        rationale,
        evaluatorId: staff.userId,
      },
      update: {
        score,
        rationale,
        evaluatorId: staff.userId,
      },
    });
  }

  const overall = weightedScore(ratings);
  const recommendation = recommendationFromScore(overall);
  await prisma.attempt.update({
    where: { id: attemptId },
    data: { overallScore: overall, recommendation },
  });
  await prisma.candidate.update({
    where: { id: candidateId },
    data: { status: "REVIEWED" },
  });
  await audit({
    actorId: staff.userId,
    action: "SAVE_EVALUATION",
    entity: "Attempt",
    entityId: attemptId,
    metadata: { overall, recommendation },
  });
  redirect(`/console/candidates/${candidateId}`);
}

export async function saveInterview(formData: FormData) {
  const staff = await getStaffSession();
  if (!staff) redirect("/login");
  const attemptId = String(formData.get("attemptId") ?? "");
  const candidateId = String(formData.get("candidateId") ?? "");
  const notes = String(formData.get("notes") ?? "");
  const probesUsed = String(formData.get("probesUsed") ?? "");
  await prisma.interview.upsert({
    where: { attemptId },
    create: {
      attemptId,
      notes,
      probesUsed,
      interviewerId: staff.userId,
    },
    update: { notes, probesUsed, interviewerId: staff.userId },
  });
  await audit({
    actorId: staff.userId,
    action: "SAVE_INTERVIEW",
    entity: "Attempt",
    entityId: attemptId,
  });
  redirect(`/console/candidates/${candidateId}`);
}

export async function recordDecision(formData: FormData) {
  const staff = await getStaffSession();
  if (!staff) redirect("/login");
  const attemptId = String(formData.get("attemptId") ?? "");
  const candidateId = String(formData.get("candidateId") ?? "");
  const outcome = String(formData.get("outcome") ?? "");
  const rationale = String(formData.get("rationale") ?? "").trim();
  if (!outcome || !rationale) {
    throw new Error("Choose an outcome and add a short reason.");
  }
  await prisma.decision.create({
    data: {
      candidateId,
      attemptId,
      outcome,
      rationale,
      decidedById: staff.userId,
    },
  });
  await prisma.candidate.update({
    where: { id: candidateId },
    data: { status: "DECIDED" },
  });
  await audit({
    actorId: staff.userId,
    action: "RECORD_DECISION",
    entity: "Candidate",
    entityId: candidateId,
    metadata: { outcome },
  });
  redirect(`/console/candidates/${candidateId}`);
}
