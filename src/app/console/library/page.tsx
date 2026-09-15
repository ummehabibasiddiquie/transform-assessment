import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/access";
import { importLibraryFile } from "@/lib/library-actions";
import { BANK_LABELS, type ContentBank } from "@/lib/library";

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
  const [roles, competencies, types, blueprints, items] = await Promise.all([
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
        <p className="text-xs uppercase tracking-[0.2em] text-[#9aa392]">Assessment designer</p>
        <h1 className="mt-2 font-serif text-4xl text-[#f3efe6]">Content library</h1>
        <p className="mt-3 text-sm leading-6 text-[#c8cdb8]">
          Import the manager’s Excel library. After import, roles and tasks live in
          the database — not in the website code. Candidate papers are not yet
          generated from this bank; this screen is the first working library.
        </p>
      </div>

      {query.error ? <p className="text-sm text-[#d9784a]">{query.error}</p> : null}
      {query.imported ? (
        <p className="text-sm text-[#9aa392]">Library imported. Review the counts below.</p>
      ) : null}

      <section className="rounded-lg border border-[#2a332a] p-5">
        <h2 className="font-serif text-2xl text-[#f3efe6]">Import workbook</h2>
        <p className="mt-2 text-sm leading-6 text-[#c8cdb8]">
          Use <span className="text-[#f3efe6]">TRANSFORM_Master_Assessment_Content_Library_V2.xlsx</span>.
          Importing replaces the previous library records. It does not delete
          candidates who already started.
        </p>
        <form action={importLibraryFile} className="mt-4 flex flex-wrap items-center gap-3">
          <input
            type="file"
            name="file"
            accept=".xlsx"
            required
            className="text-sm text-[#c8cdb8]"
          />
          <button className="rounded-md bg-[#d9784a] px-4 py-2 text-sm font-medium text-[#121612]">
            Import library
          </button>
        </form>
        {latest ? (
          <p className="mt-3 text-xs uppercase tracking-[0.14em] text-[#9aa392]">
            Last import: {latest.fileName} · {latest.importedAt.toLocaleString()} · {latest.libraryVersion}
          </p>
        ) : (
          <p className="mt-3 text-sm text-[#9aa392]">No library imported yet.</p>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link className="rounded-lg border border-[#2a332a] p-4 hover:bg-[#1c241c]" href="/console/library/roles">
          <p className="text-xs uppercase tracking-[0.14em] text-[#9aa392]">Roles</p>
          <p className="mt-2 font-serif text-3xl text-[#f3efe6]">{roles}</p>
        </Link>
        <Link className="rounded-lg border border-[#2a332a] p-4 hover:bg-[#1c241c]" href="/console/library/simulations">
          <p className="text-xs uppercase tracking-[0.14em] text-[#9aa392]">Work simulations</p>
          <p className="mt-2 font-serif text-3xl text-[#f3efe6]">{byBank.WORK_SIMULATION ?? 0}</p>
        </Link>
        <div className="rounded-lg border border-[#2a332a] p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-[#9aa392]">Competencies</p>
          <p className="mt-2 font-serif text-3xl text-[#f3efe6]">{competencies}</p>
        </div>
        <div className="rounded-lg border border-[#2a332a] p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-[#9aa392]">Role blueprints</p>
          <p className="mt-2 font-serif text-3xl text-[#f3efe6]">{blueprints}</p>
        </div>
      </section>

      <section>
        <h2 className="font-serif text-2xl text-[#f3efe6]">Banks</h2>
        <ul className="mt-4 divide-y divide-[#2a332a] rounded-lg border border-[#2a332a]">
          {(Object.keys(BANK_LABELS) as ContentBank[]).map((bank) => (
            <li key={bank} className="flex items-center justify-between px-4 py-3 text-sm">
              <Link className="text-[#f3efe6] hover:underline" href={`/console/library/items?bank=${bank}`}>
                {BANK_LABELS[bank]}
              </Link>
              <span className="text-[#9aa392]">{byBank[bank] ?? 0}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-[#9aa392]">{types} assessment types in the type library.</p>
      </section>
    </div>
  );
}
