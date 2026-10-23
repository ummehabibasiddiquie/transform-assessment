import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCandidateSession } from "@/lib/auth";
import { submitAttempt } from "@/lib/actions";
import { responseHasAnswer } from "@/lib/question-shape";

export const maxDuration = 60;

const PARTS = [
  { module: "COMMON_APTITUDE", label: "Part 1 · Aptitude" },
  { module: "COMMON_PROBLEM_SOLVING", label: "Part 2 · Problem solving" },
  { module: "ROLE", label: "Part 3 · Role tasks" },
];

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
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
              title: true,
              module: true,
            },
          },
        },
      },
    },
  });
  if (!attempt) redirect(`/a/${token}`);
  if (attempt.status === "SUBMITTED") redirect(`/a/${token}/done`);

  const answered = new Set(
    attempt.responses
      .filter((item) => responseHasAnswer(item.contentJson))
      .map((item) => item.taskId),
  );
  const answeredCount = answered.size;
  const total = attempt.assessmentVersion.tasks.length;

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="font-serif text-4xl">Review before you submit</h1>
        <p className="mt-4 text-base leading-7 text-ink-soft">
          After you submit, you cannot change answers. You can still go back to any
          task now. Competency names and scores are not shown — that is intentional.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          {answeredCount} of {total} tasks have an answer.
        </p>
        <div className="mt-8 space-y-8">
          {PARTS.map((part) => {
            const tasks = attempt.assessmentVersion.tasks.filter(
              (task) => task.module === part.module,
            );
            if (tasks.length === 0) return null;
            return (
              <section key={part.module}>
                <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">{part.label}</p>
                <ul className="mt-3 space-y-3">
                  {tasks.map((task) => {
                    const saved = answered.has(task.id);
                    return (
                      <li
                        key={task.id}
                        className="flex items-center justify-between rounded-md border border-line px-4 py-3"
                      >
                        <div>
                          <p className="text-sm">
                            Task {task.sequence}: {task.title}
                          </p>
                          <p className="text-xs text-ink-soft">
                            {saved ? "Answered" : "No answer yet"}
                          </p>
                        </div>
                        <Link className="text-sm text-clay" href={`/a/${token}/t/${task.sequence}`}>
                          Open
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
          {attempt.assessmentVersion.tasks.some(
            (task) => !PARTS.some((part) => part.module === task.module),
          ) ? (
            <section>
              <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">Other tasks</p>
              <ul className="mt-3 space-y-3">
                {attempt.assessmentVersion.tasks
                  .filter((task) => !PARTS.some((part) => part.module === task.module))
                  .map((task) => {
                    const saved = answered.has(task.id);
                    return (
                      <li
                        key={task.id}
                        className="flex items-center justify-between rounded-md border border-line px-4 py-3"
                      >
                        <div>
                          <p className="text-sm">
                            Task {task.sequence}: {task.title}
                          </p>
                          <p className="text-xs text-ink-soft">
                            {saved ? "Answered" : "No answer yet"}
                          </p>
                        </div>
                        <Link className="text-sm text-clay" href={`/a/${token}/t/${task.sequence}`}>
                          Open
                        </Link>
                      </li>
                    );
                  })}
              </ul>
            </section>
          ) : null}
        </div>
        <form action={submitAttempt.bind(null, token)} className="mt-10">
          <button className="btn-accent rounded-md px-5 py-2.5 text-sm font-medium">
            Submit assessment
          </button>
        </form>
      </div>
    </main>
  );
}
