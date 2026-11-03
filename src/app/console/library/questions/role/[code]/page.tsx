import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/access";

const MODULE_LABEL: Record<string, string> = {
  COMMON_APTITUDE: "Aptitude and reasoning",
  COMMON_PROBLEM_SOLVING: "Problem solving",
  ROLE: "Role tasks",
};

export default async function RoleQuestionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireStaff("editAssessment");
  const { code } = await params;
  const { saved } = await searchParams;

  const items =
    code === "COMMON"
      ? await prisma.bankItem.findMany({
          where: { module: { in: ["COMMON_APTITUDE", "COMMON_PROBLEM_SOLVING"] } },
          orderBy: [{ module: "asc" }, { sourceId: "asc" }],
        })
      : await prisma.bankItem.findMany({
          where: {
            module: "ROLE",
            track: { code },
          },
          orderBy: { sourceId: "asc" },
        });

  const track =
    code === "COMMON"
      ? { code: "COMMON", roleName: "All roles", level: "Common sections" }
      : await prisma.assessmentTrack.findUnique({ where: { code } });
  if (!track) notFound();

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <Link href="/console/library/questions" className="text-sm text-staff-accent">
          Questions in the system
        </Link>
        <h1 className="mt-3 font-serif text-4xl text-staff-strong">{track.roleName}</h1>
        <p className="mt-2 text-sm text-staff-body">
          {track.level} · {items.length} questions
        </p>
        {saved ? (
          <p className="mt-2 text-sm text-staff-muted">Question saved. New invites will use this text.</p>
        ) : null}
      </div>

      <p className="text-sm">
        <a
          href={`/console/library/question-template?role=${code}`}
          className="text-staff-accent"
        >
          Download this section as Excel
        </a>
      </p>

      <div className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-staff-muted">No questions in this section.</p>
        ) : (
          items.map((item) => (
            <article key={item.id} className="rounded-lg border border-staff-line p-5">
              <p className="text-xs uppercase tracking-[0.14em] text-staff-muted">
                {item.sourceId} · {MODULE_LABEL[item.module] ?? item.module} · {item.responseType}
                {item.status === "RETIRED" ? " · Retired" : ""}
              </p>
              <h2 className="mt-1 font-serif text-xl text-staff-strong">{item.title}</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-staff-body">{item.prompt}</p>
              {item.answerKey ? (
                <p className="mt-3 text-sm text-staff-muted">
                  Answer key: {item.answerKey}
                </p>
              ) : null}
              <Link
                className="mt-3 inline-flex text-sm text-staff-accent"
                href={`/console/library/questions/item/${item.id}`}
              >
                Open or edit
              </Link>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
