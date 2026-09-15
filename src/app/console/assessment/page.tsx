import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/access";
import {
  deleteTask,
  publishDraft,
  saveVersionCopy,
  startTemplateDraft,
} from "@/lib/content-actions";

export default async function AssessmentContentPage() {
  await requireStaff("editAssessment");
  const assessment = await prisma.assessment.findFirst({
    include: {
      roleVersion: {
        include: { role: true, competencies: { orderBy: { sortOrder: "asc" } } },
      },
      versions: {
        include: { tasks: { orderBy: { sequence: "asc" } }, invites: true, attempts: true },
        orderBy: { version: "desc" },
      },
    },
  });

  if (!assessment) {
    return <p>No assessment has been seeded yet.</p>;
  }

  const draft = assessment.versions.find((item) => item.status === "DRAFT");
  const published = assessment.versions.find((item) => item.status === "PUBLISHED");
  const working = draft ?? published;
  const locked = working?.status === "PUBLISHED";

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#9aa392]">
          {assessment.roleVersion.role.name}
        </p>
        <h1 className="mt-2 font-serif text-4xl text-[#f3efe6]">Tasks and questions</h1>
        <p className="mt-3 text-sm leading-6 text-[#c8cdb8]">
          Edit the shared paper here. Publishing creates a new version for people
          you invite after that. Candidates who already started keep the paper they
          were given.
        </p>
      </div>

      {working ? (
        <section className="rounded-lg border border-[#2a332a] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-2xl text-[#f3efe6]">
              {locked ? "Published paper" : "Draft — not given to anyone yet"}
            </h2>
            <p className="text-xs uppercase tracking-[0.14em] text-[#9aa392]">
              Version {working.version}
            </p>
          </div>

          {locked ? (
            <form action={startTemplateDraft.bind(null, assessment.id)} className="mt-4">
              <button className="rounded-md bg-[#d9784a] px-4 py-2 text-sm font-medium text-[#121612]">
                Edit a new draft
              </button>
            </form>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/console/assessment/tasks/new?versionId=${working.id}`}
                className="rounded-md bg-[#d9784a] px-4 py-2 text-sm font-medium text-[#121612]"
              >
                Add task
              </Link>
              <form action={publishDraft.bind(null, working.id)}>
                <button className="rounded-md border border-[#d9784a] px-4 py-2 text-sm text-[#d9784a]">
                  Publish for new invites
                </button>
              </form>
            </div>
          )}

          <form action={saveVersionCopy} className="mt-6 space-y-4">
            <input type="hidden" name="versionId" value={working.id} />
            <label className="block space-y-1.5">
              <span className="text-xs uppercase tracking-[0.16em] text-[#9aa392]">
                Opening instructions
              </span>
              <textarea
                name="instructions"
                rows={5}
                defaultValue={working.instructions}
                disabled={locked}
                className="w-full rounded-md border border-[#2a332a] bg-[#121612] px-3 py-2 text-sm text-[#f3efe6] disabled:opacity-60"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs uppercase tracking-[0.16em] text-[#9aa392]">
                AI / resource policy
              </span>
              <textarea
                name="aiPolicy"
                rows={3}
                defaultValue={working.aiPolicy}
                disabled={locked}
                className="w-full rounded-md border border-[#2a332a] bg-[#121612] px-3 py-2 text-sm text-[#f3efe6] disabled:opacity-60"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs uppercase tracking-[0.16em] text-[#9aa392]">
                Estimated minutes
              </span>
              <input
                name="durationMin"
                type="number"
                defaultValue={assessment.durationMin}
                disabled={locked}
                className="w-full rounded-md border border-[#2a332a] bg-[#121612] px-3 py-2 text-sm text-[#f3efe6] disabled:opacity-60"
              />
            </label>
            {locked ? null : (
              <button className="rounded-md border border-[#2a332a] px-4 py-2 text-sm text-[#f3efe6]">
                Save instructions
              </button>
            )}
          </form>
        </section>
      ) : null}

      <section className="rounded-lg border border-[#2a332a] p-5">
        <h2 className="font-serif text-2xl text-[#f3efe6]">Competencies</h2>
        <ul className="mt-4 space-y-3 text-sm text-[#c8cdb8]">
          {assessment.roleVersion.competencies.map((item) => (
            <li key={item.id}>
              <span className="text-[#f3efe6]">{item.name}</span> · {item.weight}% — {item.definition}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-2xl text-[#f3efe6]">
          Tasks on this {locked ? "published" : "draft"} paper
        </h2>
        {working?.tasks.map((task) => (
          <article key={task.id} className="rounded-lg border border-[#2a332a] p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-[#9aa392]">
              Slot {task.sequence} · {task.family}
            </p>
            <h3 className="mt-1 font-serif text-xl text-[#f3efe6]">{task.title}</h3>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#c8cdb8]">
              {task.instructions}
            </p>
            {locked ? null : (
              <div className="mt-4 flex gap-3">
                <Link className="text-sm text-[#d9784a]" href={`/console/assessment/tasks/${task.id}`}>
                  Edit
                </Link>
                <form action={deleteTask}>
                  <input type="hidden" name="taskId" value={task.id} />
                  <button className="text-sm text-[#9aa392]">Remove</button>
                </form>
              </div>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
