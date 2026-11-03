import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/access";
import { importRoleQuestions } from "@/lib/library-actions";
import { SubmitButton } from "@/components/SubmitButton";
import { ConfirmForm } from "@/components/ConfirmForm";

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
  const [tracks, aptitudeCount, problemSolvingCount] = await Promise.all([
    prisma.assessmentTrack.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ roleName: "asc" }, { level: "asc" }],
      include: { _count: { select: { items: { where: { status: "APPROVED" } } } } },
    }),
    prisma.bankItem.count({ where: { module: "COMMON_APTITUDE", status: "APPROVED" } }),
    prisma.bankItem.count({ where: { module: "COMMON_PROBLEM_SOLVING", status: "APPROVED" } }),
  ]);

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link href="/console/library" className="text-sm text-staff-accent">
          Content library
        </Link>
        <h1 className="mt-3 font-serif text-4xl text-staff-strong">Questions from Excel</h1>
        <p className="mt-3 text-sm leading-6 text-staff-body">
          Use one file for any role, for several roles, or for the common sections that every
          role shares (aptitude and problem solving). One sheet per role is fine. Only the roles
          and sections in the file change; everything else stays as it is. A paper already sent
          stays as it was.
        </p>
      </div>
      {query.error ? <p className="text-sm text-staff-accent">{query.error}</p> : null}
      {query.saved ? <p className="text-sm text-staff-muted">{query.saved}</p> : null}

      <section className="rounded-lg border border-staff-line p-5">
        <h2 className="font-serif text-2xl text-staff-strong">1. Download the template</h2>
        <p className="mt-2 text-sm leading-6 text-staff-body">
          One row is one question. Repeat the role code, role name, and level on every
          row. For aptitude and problem solving, use Role_Code COMMON and Module
          COMMON_APTITUDE or COMMON_PROBLEM_SOLVING. Options go in one cell, each on its own
          line, such as A. Yes. Delete the example rows before uploading.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/console/library/question-template"
            className="inline-flex rounded-md border border-staff-accent px-4 py-2 text-sm text-staff-strong"
          >
            Download question template
          </a>
          <a
            href="/console/library/question-template?role=ALL"
            className="inline-flex rounded-md border border-staff-line px-4 py-2 text-sm text-staff-strong"
          >
            Download the whole library (one sheet per role)
          </a>
        </div>
      </section>

      <ConfirmForm
        action={importRoleQuestions}
        onlyIf={{ field: "mode", value: "replace" }}
        message={
          "Replace existing questions?\n\nFor every role and common section in this file, the current questions will be retired and only the questions in this file will be used for new papers.\n\nRoles and sections not in the file are not changed. Papers already sent are not affected.\n\nClick OK to replace, or Cancel to stop."
        }
        className="space-y-4 rounded-lg border border-staff-line p-5"
      >
        <h2 className="font-serif text-2xl text-staff-strong">2. Upload the completed file</h2>
        <input type="file" name="file" accept=".xlsx" required className={inputClass} />
        <fieldset className="space-y-2 text-sm">
          <legend className="text-xs uppercase tracking-[0.16em] text-staff-muted">
            What should happen to the questions already there?
          </legend>
          <label className="flex items-start gap-2">
            <input type="radio" name="mode" value="add" defaultChecked className="mt-1" />
            <span className="text-staff-body">
              <span className="text-staff-strong">Add to existing questions.</span> New rows are
              added and matching Item_IDs are updated. Older questions stay.
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input type="radio" name="mode" value="replace" className="mt-1" />
            <span className="text-staff-body">
              <span className="text-staff-strong">Replace existing questions.</span> For each role
              and common section in this file, older questions are retired and only this
              file&rsquo;s questions are used.
            </span>
          </label>
        </fieldset>
        <SubmitButton
          pendingText="Importing questions…"
          className="rounded-md bg-staff-accent px-4 py-2.5 text-sm font-medium text-staff-bg"
        >
          Import questions
        </SubmitButton>
      </ConfirmForm>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-staff-strong">Common sections (all roles)</h2>
        <div className="overflow-hidden rounded-lg border border-staff-line">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-staff-line text-xs uppercase tracking-[0.14em] text-staff-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Section</th>
                <th className="px-4 py-3 font-medium">Questions</th>
                <th className="px-4 py-3 font-medium">Per paper</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-staff-line">
                <td className="px-4 py-3 text-staff-strong">Aptitude</td>
                <td className="px-4 py-3 text-staff-body">{aptitudeCount}</td>
                <td className="px-4 py-3 text-staff-body">All in bank</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-staff-strong">Problem solving</td>
                <td className="px-4 py-3 text-staff-body">{problemSolvingCount}</td>
                <td className="px-4 py-3 text-staff-body">All in bank</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm">
          <Link href="/console/library/questions/role/COMMON" className="text-staff-accent">
            View common questions
          </Link>
          <span className="text-staff-muted"> · </span>
          <a href="/console/library/question-template?role=COMMON" className="text-staff-accent">
            Download Excel
          </a>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-staff-strong">Roles already loaded</h2>
        <div className="overflow-hidden rounded-lg border border-staff-line">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-staff-line text-xs uppercase tracking-[0.14em] text-staff-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Level</th>
                <th className="px-4 py-3 font-medium">Questions</th>
                <th className="px-4 py-3 font-medium">Open</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((track) => (
                <tr key={track.id} className="border-b border-staff-line last:border-0">
                  <td className="px-4 py-3 text-staff-strong">{track.roleName}</td>
                  <td className="px-4 py-3 text-staff-body">{track.level}</td>
                  <td className="px-4 py-3 text-staff-body">{track._count.items}</td>
                  <td className="px-4 py-3">
                    <Link className="text-staff-accent" href={`/console/library/questions/role/${track.code}`}>
                      View
                    </Link>
                    <span className="text-staff-muted"> · </span>
                    <a
                      href={`/console/library/question-template?role=${track.code}`}
                      className="text-staff-accent"
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
