import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/access";
import { importRoleQuestions } from "@/lib/library-actions";

export const maxDuration = 60;

const inputClass =
  "w-full rounded-md border border-staff-line bg-staff-bg px-3 py-2.5 text-staff-strong outline-none focus:border-staff-accent";

export default async function ConfigureLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireStaff("editAssessment");
  const query = await searchParams;
  const tracks = await prisma.assessmentTrack.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ roleName: "asc" }, { level: "asc" }],
    include: { _count: { select: { items: true } } },
  });

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link href="/console/library" className="text-sm text-staff-accent">
          Content library
        </Link>
        <h1 className="mt-3 font-serif text-4xl text-staff-strong">Add a role from Excel</h1>
        <p className="mt-3 text-sm leading-6 text-staff-body">
          Put the role and all of its questions in one spreadsheet, then upload it.
          To change an existing role, download its questions, edit the rows, and upload
          the same file. Keep the Item_ID to update a question. Add a row to add one.
          Set Status to Retired to drop a question from future papers. A paper already
          sent stays as it was.
        </p>
      </div>
      {query.error ? <p className="text-sm text-staff-accent">{query.error}</p> : null}
      {query.saved ? <p className="text-sm text-staff-muted">{query.saved}</p> : null}

      <section className="rounded-lg border border-staff-line p-5">
        <h2 className="font-serif text-2xl text-staff-strong">1. Download the template</h2>
        <p className="mt-2 text-sm leading-6 text-staff-body">
          One row is one question. Repeat the role code, role name, and level on every
          row. Options go in one cell, each on its own line, such as A. Yes.
        </p>
        <a
          href="/console/library/question-template"
          className="mt-4 inline-flex rounded-md border border-staff-accent px-4 py-2 text-sm text-staff-strong"
        >
          Download question template
        </a>
      </section>

      <form action={importRoleQuestions} className="space-y-4 rounded-lg border border-staff-line p-5">
        <h2 className="font-serif text-2xl text-staff-strong">2. Upload the completed file</h2>
        <input type="file" name="file" accept=".xlsx" required className={inputClass} />
        <button className="rounded-md bg-staff-accent px-4 py-2.5 text-sm font-medium text-staff-bg">
          Import questions
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-staff-strong">Roles already loaded</h2>
        <div className="overflow-hidden rounded-lg border border-staff-line">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-staff-line text-xs uppercase tracking-[0.14em] text-staff-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Level</th>
                <th className="px-4 py-3 font-medium">Questions</th>
                <th className="px-4 py-3 font-medium">Edit</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((track) => (
                <tr key={track.id} className="border-b border-staff-line last:border-0">
                  <td className="px-4 py-3 text-staff-strong">{track.roleName}</td>
                  <td className="px-4 py-3 text-staff-body">{track.level}</td>
                  <td className="px-4 py-3 text-staff-body">{track._count.items}</td>
                  <td className="px-4 py-3">
                    <a
                      href={`/console/library/question-template?role=${track.code}`}
                      className="text-staff-accent"
                    >
                      Download
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
