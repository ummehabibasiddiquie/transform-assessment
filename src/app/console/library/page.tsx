import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/access";
import { importLibraryFile } from "@/lib/library-actions";
import { BANK_LABELS, type ContentBank } from "@/lib/library";

export const maxDuration = 60;

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ imported?: string; error?: string }>;
}) {
  await requireStaff("editAssessment");
  const query = await searchParams;
  const latest = await prisma.libraryImport.findFirst({
    orderBy: { importedAt: "desc" },
  });
  const [roleTracks, questions, roles, competencies, types, blueprints, items] = await Promise.all([
    prisma.assessmentTrack.count({ where: { status: "ACTIVE" } }),
    prisma.bankItem.count({ where: { status: "APPROVED" } }),
    prisma.libraryRole.count(),
    prisma.libraryCompetency.count(),
    prisma.libraryAssessmentType.count(),
    prisma.libraryBlueprint.count(),
    prisma.libraryContentItem.groupBy({
      by: ["bank"],
      _count: { _all: true },
    }),
  ]);

  const byBank = Object.fromEntries(
    items.map((row) => [row.bank, row._count._all]),
  ) as Partial<Record<ContentBank, number>>;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-staff-muted">V4 question bank</p>
        <h1 className="mt-2 font-serif text-4xl text-staff-strong">Content library</h1>
        <p className="mt-3 text-sm leading-6 text-staff-body">
          Import the V4 workbook. Questions are stored in the database. When you
          invite a candidate, choose a role and level and the paper is built from
          this library.
        </p>
      </div>

      {query.error ? <p className="text-sm text-staff-accent">{query.error}</p> : null}
      {query.imported ? (
        <p className="text-sm text-staff-muted">Library imported. Review the counts below.</p>
      ) : null}
      <p className="text-sm">
        <Link href="/console/library/configure" className="text-staff-accent">
          Add a role and its questions from Excel
        </Link>
      </p>

      <section className="rounded-lg border border-staff-line p-5">
        <h2 className="font-serif text-2xl text-staff-strong">Import master workbook</h2>
        <p className="mt-2 text-sm leading-6 text-staff-body">
          Use the full V4 master workbook (the TRANSFORM Master Assessment Content
          Library .xlsx file). Candidates who already have a link keep the paper
          they were sent.
        </p>
        <div className="mt-3 rounded-md border border-staff-accent p-3 text-sm leading-6 text-staff-text">
          <p className="font-medium text-staff-accent">This replaces the whole library.</p>
          <p className="mt-1">
            All roles and questions are reloaded from the file. Any questions added or
            changed through role Excel uploads are lost. To update only some roles, use{" "}
            <Link href="/console/library/configure" className="text-staff-accent underline">
              Add a role and its questions from Excel
            </Link>{" "}
            instead.
          </p>
        </div>
        <form action={importLibraryFile} className="mt-4 flex flex-wrap items-center gap-3">
          <input
            type="file"
            name="file"
            accept=".xlsx"
            required
            className="text-sm text-staff-body"
          />
          <button className="rounded-md bg-staff-accent px-4 py-2 text-sm font-medium text-staff-bg">
            Import library
          </button>
        </form>
        {latest ? (
          <p className="mt-3 text-xs uppercase tracking-[0.14em] break-all text-staff-muted">
            Last import: {latest.fileName} · {latest.importedAt.toLocaleString()} · {latest.libraryVersion}
          </p>
        ) : (
          <p className="mt-3 text-sm text-staff-muted">No library imported yet.</p>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link className="rounded-lg border border-staff-line p-4 hover:bg-staff-hover" href="/console/library/configure">
          <p className="text-xs uppercase tracking-[0.14em] text-staff-muted">Roles and levels you can invite</p>
          <p className="mt-2 font-serif text-3xl text-staff-strong">{roleTracks}</p>
        </Link>
        <div className="rounded-lg border border-staff-line p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-staff-muted">Questions in use</p>
          <p className="mt-2 font-serif text-3xl text-staff-strong">{questions}</p>
        </div>
        <Link className="rounded-lg border border-staff-line p-4 hover:bg-staff-hover" href="/console/library/roles">
          <p className="text-xs uppercase tracking-[0.14em] text-staff-muted">Role profiles in the workbook</p>
          <p className="mt-2 font-serif text-3xl text-staff-strong">{roles}</p>
        </Link>
        <Link className="rounded-lg border border-staff-line p-4 hover:bg-staff-hover" href="/console/library/simulations">
          <p className="text-xs uppercase tracking-[0.14em] text-staff-muted">Work simulations</p>
          <p className="mt-2 font-serif text-3xl text-staff-strong">{byBank.WORK_SIMULATION ?? 0}</p>
        </Link>
        <div className="rounded-lg border border-staff-line p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-staff-muted">Competencies</p>
          <p className="mt-2 font-serif text-3xl text-staff-strong">{competencies}</p>
        </div>
        <div className="rounded-lg border border-staff-line p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-staff-muted">Role blueprints</p>
          <p className="mt-2 font-serif text-3xl text-staff-strong">{blueprints}</p>
        </div>
      </section>

      <section>
        <h2 className="font-serif text-2xl text-staff-strong">Banks</h2>
        <ul className="mt-4 divide-y divide-staff-line rounded-lg border border-staff-line">
          {(Object.keys(BANK_LABELS) as ContentBank[]).map((bank) => (
            <li key={bank} className="flex items-center justify-between px-4 py-3 text-sm">
              <Link className="text-staff-strong hover:underline" href={`/console/library/items?bank=${bank}`}>
                {BANK_LABELS[bank]}
              </Link>
              <span className="text-staff-muted">{byBank[bank] ?? 0}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-staff-muted">{types} assessment types in the type library.</p>
      </section>
    </div>
  );
}
