import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { customizeCandidatePaper, deleteTask } from "@/lib/content-actions";
import { requireStaff } from "@/lib/access";

export default async function CandidateTasksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff("editAssessment");
  const { id } = await params;
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: {
      attempts: { orderBy: { startedAt: "desc" }, take: 1 },
      invites: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          assessmentVersion: { include: { tasks: { orderBy: { sequence: "asc" } } } },
        },
      },
    },
  });
  if (!candidate) notFound();

  const invite = candidate.invites[0];
  const version = invite?.assessmentVersion;
  const started = candidate.attempts.length > 0;
  const submitted = candidate.attempts[0]?.status === "SUBMITTED";
  const canCustomize = Boolean(invite) && !started;
  const canEdit = version?.status === "PRIVATE" && !submitted;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link href={`/console/candidates/${candidate.id}`} className="text-sm text-[#d9784a]">
          Back to {candidate.name}
        </Link>
        <h1 className="mt-3 font-serif text-4xl text-[#f3efe6]">This candidate’s tasks</h1>
        <p className="mt-3 text-sm leading-6 text-[#c8cdb8]">
          Changes here apply only to {candidate.name}. The shared template used for
          other people does not change.
        </p>
      </div>

      {version ? (
        <p className="text-sm text-[#9aa392]">
          Paper version {version.version} · {version.status.toLowerCase()}
        </p>
      ) : (
        <p className="text-sm text-[#9aa392]">Invite this person first.</p>
      )}

      {submitted ? (
        <p className="rounded-md border border-[#2a332a] p-4 text-sm text-[#c8cdb8]">
          Submitted work is frozen. Create a new invite if you need a different paper.
        </p>
      ) : null}

      {canCustomize && version?.status !== "PRIVATE" ? (
        <form action={customizeCandidatePaper.bind(null, candidate.id)}>
          <button className="rounded-md bg-[#d9784a] px-4 py-2.5 text-sm font-medium text-[#121612]">
            Make a private copy for this person
          </button>
        </form>
      ) : null}

      {started && !submitted ? (
        <p className="text-sm text-[#c8cdb8]">
          They have already started, so this paper is locked to keep scoring fair.
        </p>
      ) : null}

      {canEdit ? (
        <Link
          href={`/console/assessment/tasks/new?versionId=${version.id}&candidateId=${candidate.id}`}
          className="inline-flex rounded-md bg-[#d9784a] px-4 py-2 text-sm font-medium text-[#121612]"
        >
          Add a task for {candidate.name}
        </Link>
      ) : null}

      <section className="space-y-4">
        {version?.tasks.map((task) => (
          <article key={task.id} className="rounded-lg border border-[#2a332a] p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-[#9aa392]">
              Task {task.sequence} · {task.family}
            </p>
            <h2 className="mt-1 font-serif text-xl text-[#f3efe6]">{task.title}</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#c8cdb8]">
              {task.instructions}
            </p>
            {canEdit ? (
              <div className="mt-4 flex gap-3">
                <Link
                  className="text-sm text-[#d9784a]"
                  href={`/console/candidates/${candidate.id}/tasks/${task.id}`}
                >
                  Edit
                </Link>
                <form action={deleteTask}>
                  <input type="hidden" name="taskId" value={task.id} />
                  <input type="hidden" name="candidateId" value={candidate.id} />
                  <button className="text-sm text-[#9aa392]">Remove</button>
                </form>
              </div>
            ) : null}
          </article>
        ))}
      </section>
    </div>
  );
}
