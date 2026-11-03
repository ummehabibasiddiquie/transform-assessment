import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { customizeCandidatePaper, deleteTask } from "@/lib/content-actions";
import { requireStaff } from "@/lib/access";
import { can } from "@/lib/permissions";

export default async function CandidateTasksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staff = await requireStaff("viewCandidates");
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
  const canCustomize = can(staff.role, "editAssessment") && Boolean(invite) && !started;
  const canEdit = can(staff.role, "editAssessment") && version?.status === "PRIVATE" && !submitted;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link href={`/console/candidates/${candidate.id}`} className="text-sm text-staff-accent">
          Back to {candidate.name}
        </Link>
        <h1 className="mt-3 font-serif text-4xl text-staff-strong">
          Question paper sent to {candidate.name}
        </h1>
        <p className="mt-3 text-sm leading-6 text-staff-body">
          This is the paper on their invite link, including the question text. The candidate
          sees the same questions when they open the test. Changes here, if allowed, apply
          only to this person.
        </p>
      </div>

      {version ? (
        <p className="text-sm text-staff-muted">
          Paper version {version.version} · {version.status.toLowerCase()}
        </p>
      ) : (
        <p className="text-sm text-staff-muted">Invite this person first.</p>
      )}

      {submitted ? (
        <p className="rounded-md border border-staff-line p-4 text-sm text-staff-body">
          Submitted work is frozen. Create a new invite if you need a different paper.
        </p>
      ) : null}

      {canCustomize && version?.status !== "PRIVATE" ? (
        <form action={customizeCandidatePaper.bind(null, candidate.id)}>
          <button className="rounded-md bg-staff-accent px-4 py-2.5 text-sm font-medium text-staff-bg">
            Make a private copy for this person
          </button>
        </form>
      ) : null}

      {started && !submitted ? (
        <p className="text-sm text-staff-body">
          They have already started, so this paper is locked to keep scoring fair.
        </p>
      ) : null}

      {canEdit ? (
        <Link
          href={`/console/assessment/tasks/new?versionId=${version.id}&candidateId=${candidate.id}`}
          className="inline-flex rounded-md bg-staff-accent px-4 py-2 text-sm font-medium text-staff-bg"
        >
          Add a task for {candidate.name}
        </Link>
      ) : null}

      <section className="space-y-4">
        {version?.tasks.map((task) => (
          <article key={task.id} className="rounded-lg border border-staff-line p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-staff-muted">
              Task {task.sequence} · {task.family}
            </p>
            <h2 className="mt-1 font-serif text-xl text-staff-strong">{task.title}</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-staff-body">
              {task.instructions}
            </p>
            {canEdit ? (
              <div className="mt-4 flex gap-3">
                <Link
                  className="text-sm text-staff-accent"
                  href={`/console/candidates/${candidate.id}/tasks/${task.id}`}
                >
                  Edit
                </Link>
                <form action={deleteTask}>
                  <input type="hidden" name="taskId" value={task.id} />
                  <input type="hidden" name="candidateId" value={candidate.id} />
                  <button className="text-sm text-staff-muted">Remove</button>
                </form>
              </div>
            ) : null}
          </article>
        ))}
      </section>
    </div>
  );
}
