import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCandidateSession } from "@/lib/auth";
import { submitAttempt } from "@/lib/actions";

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
      assessmentVersion: { include: { tasks: { orderBy: { sequence: "asc" } } } },
    },
  });
  if (!attempt) redirect(`/a/${token}`);
  if (attempt.status === "SUBMITTED") redirect(`/a/${token}/done`);

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="font-serif text-4xl">Review before you submit</h1>
        <p className="mt-4 text-base leading-7 text-ink-soft">
          After you submit, you cannot change answers. You can still go back to any
          task now. Competency names and scores are not shown — that is intentional.
        </p>
        <ul className="mt-8 space-y-3">
          {attempt.assessmentVersion.tasks.map((task) => {
            const saved = attempt.responses.some((item) => item.taskId === task.id);
            return (
              <li key={task.id} className="flex items-center justify-between rounded-md border border-line px-4 py-3">
                <div>
                  <p className="text-sm">
                    Task {task.sequence}: {task.title}
                  </p>
                  <p className="text-xs text-ink-soft">{saved ? "Saved" : "No answer yet"}</p>
                </div>
                <Link className="text-sm text-clay" href={`/a/${token}/t/${task.sequence}`}>
                  Open
                </Link>
              </li>
            );
          })}
        </ul>
        <form action={submitAttempt.bind(null, token)} className="mt-10">
          <button className="btn-accent rounded-md px-5 py-2.5 text-sm font-medium">
            Submit assessment
          </button>
        </form>
      </div>
    </main>
  );
}
