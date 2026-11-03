import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/access";

export default async function LibraryQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireStaff("editAssessment");
  const query = await searchParams;
  const [latest, aptitude, problemSolving, tracks] = await Promise.all([
    prisma.libraryImport.findFirst({ orderBy: { importedAt: "desc" } }),
    prisma.bankItem.count({ where: { module: "COMMON_APTITUDE", status: "APPROVED" } }),
    prisma.bankItem.count({
      where: { module: "COMMON_PROBLEM_SOLVING", status: "APPROVED" },
    }),
    prisma.assessmentTrack.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ roleName: "asc" }, { level: "asc" }],
      include: { _count: { select: { items: { where: { status: "APPROVED" } } } } },
    }),
  ]);

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link href="/console/library" className="text-sm text-staff-accent">
          Content library
        </Link>
        <h1 className="mt-3 font-serif text-4xl text-staff-strong">Questions in the system</h1>
        <p className="mt-3 text-sm leading-6 text-staff-body">
          This is the live question bank. Anyone with library access can open a role, read the
          questions, edit them, or download Excel. You do not need the original file.
        </p>
        {latest ? (
          <p className="mt-2 text-sm text-staff-muted">
            Last loaded file: {latest.fileName} · {latest.importedAt.toLocaleString()}
          </p>
        ) : null}
      </div>
      {query.error ? <p className="text-sm text-staff-accent">{query.error}</p> : null}

      <p className="flex flex-wrap gap-3 text-sm">
        <a
          href="/console/library/question-template?role=ALL"
          className="rounded-md bg-staff-accent px-4 py-2 font-medium text-staff-bg"
        >
          Download the full library Excel
        </a>
        <Link href="/console/library/configure" className="rounded-md border border-staff-line px-4 py-2 text-staff-strong">
          Upload an updated file
        </Link>
      </p>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-staff-strong">Common (all roles)</h2>
        <div className="overflow-hidden rounded-lg border border-staff-line">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-staff-line text-xs uppercase tracking-[0.14em] text-staff-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Section</th>
                <th className="px-4 py-3 font-medium">Questions</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-staff-line">
                <td className="px-4 py-3 text-staff-strong">Aptitude and reasoning</td>
                <td className="px-4 py-3">{aptitude}</td>
                <td className="px-4 py-3">
                  <Link className="text-staff-accent" href="/console/library/questions/role/COMMON">
                    View
                  </Link>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-staff-strong">Problem solving</td>
                <td className="px-4 py-3">{problemSolving}</td>
                <td className="px-4 py-3">
                  <Link className="text-staff-accent" href="/console/library/questions/role/COMMON">
                    View
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-staff-strong">Role files</h2>
        <div className="overflow-hidden rounded-lg border border-staff-line">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-staff-line text-xs uppercase tracking-[0.14em] text-staff-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Level</th>
                <th className="px-4 py-3 font-medium">Questions</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((track) => (
                <tr key={track.id} className="border-b border-staff-line last:border-0">
                  <td className="px-4 py-3 text-staff-strong">{track.roleName}</td>
                  <td className="px-4 py-3 text-staff-body">{track.level}</td>
                  <td className="px-4 py-3">{track._count.items}</td>
                  <td className="px-4 py-3">
                    <Link className="text-staff-accent" href={`/console/library/questions/role/${track.code}`}>
                      View
                    </Link>
                    <span className="text-staff-muted"> · </span>
                    <a
                      className="text-staff-accent"
                      href={`/console/library/question-template?role=${track.code}`}
                    >
                      Excel
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
