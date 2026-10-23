import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCandidateSession } from "@/lib/auth";
import { TaskWorkspace } from "@/components/TaskWorkspace";
import { parsePracticalPrompt } from "@/lib/practical-task";

export default async function CandidateTaskPage({
  params,
}: {
  params: Promise<{ token: string; sequence: string }>;
}) {
  const { token, sequence } = await params;
  const session = await getCandidateSession();
  if (!session?.attemptId || session.inviteToken !== token) {
    redirect(`/a/${token}`);
  }

  const attempt = await prisma.attempt.findUnique({
    where: { id: session.attemptId },
    include: {
      responses: true,
      assessmentVersion: {
        include: {
          tasks: {
            orderBy: { sequence: "asc" },
            select: {
              id: true,
              sequence: true,
              family: true,
              title: true,
              instructions: true,
              referenceMaterial: true,
              timeLimitMin: true,
              aiAllowed: true,
              searchAllowed: true,
              responseType: true,
              optionsJson: true,
              module: true,
            },
          },
        },
      },
    },
  });
  if (!attempt) redirect(`/a/${token}`);
  if (attempt.status === "SUBMITTED") redirect(`/a/${token}/done`);

  const sequenceNumber = Number(sequence);
  const task = attempt.assessmentVersion.tasks.find(
    (item) => item.sequence === sequenceNumber,
  );
  if (!task) notFound();

  const response = attempt.responses.find((item) => item.taskId === task.id);
  const learnTask = attempt.assessmentVersion.tasks.find((item) => item.family === "A");
  const learnResponse = learnTask
    ? attempt.responses.find((item) => item.taskId === learnTask.id)
    : null;

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line px-5 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <p className="text-xs uppercase tracking-[0.18em] text-ink-soft">
            TRANSFORM assessment
          </p>
          <p className="text-xs text-ink-soft">
            {attempt.assessmentVersion.tasks.length} tasks · answers save as you type
          </p>
        </div>
      </header>
      <TaskWorkspace
        token={token}
        task={
          task.responseType === "PRACTICAL"
            ? { ...task, instructions: "" }
            : task
        }
        taskCount={attempt.assessmentVersion.tasks.length}
        initialContent={response?.contentJson ?? "{}"}
        initialLog={response?.resourceLogJson ?? "{}"}
        previousLearnJson={task.family === "C" ? learnResponse?.contentJson : null}
        practical={task.responseType === "PRACTICAL" ? parsePracticalPrompt(task.instructions) : null}
      />
    </main>
  );
}
