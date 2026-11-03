import type { PrismaClient } from "@prisma/client";
import { bandFor, bandsForRole } from "./bands";
import { testTotals } from "./module-score";

export async function refreshTestScore(prisma: PrismaClient, attemptId: string) {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      responses: { select: { taskId: true, contentJson: true } },
      taskMarks: { select: { taskId: true, mark: true, aiMark: true } },
      assessmentVersion: {
        include: {
          assessment: { select: { name: true } },
          tasks: {
            select: {
              id: true,
              module: true,
              responseType: true,
              isGate: true,
              title: true,
              key: { select: { answerKey: true } },
            },
          },
        },
      },
    },
  });
  if (!attempt) return null;

  const totals = testTotals(attempt.assessmentVersion.tasks, attempt.responses, attempt.taskMarks);
  let recommendation: string | null = null;
  if (totals.complete && totals.percent != null) {
    const roleBands = await bandsForRole(prisma, attempt.assessmentVersion.assessment.name);
    recommendation = bandFor(totals.percent, roleBands.bands).recommendation;
  }
  await prisma.attempt.update({
    where: { id: attemptId },
    data: {
      testScore: totals.complete ? totals.percent : null,
      recommendation,
    },
  });
  return totals;
}
