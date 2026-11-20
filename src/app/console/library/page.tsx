import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/access";
import { importLibraryFile } from "@/lib/library-actions";
import { SubmitButton } from "@/components/SubmitButton";
import { ConfirmForm } from "@/components/ConfirmForm";

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
  const [roleTracks, questions] = await Promise.all([
    prisma.assessmentTrack.count({ where: { status: "ACTIVE" } }),
    prisma.bankItem.count({ where: { status: "APPROVED" } }),
  ]);

  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-staff-muted">Question bank</p>
        <h1 className="mt-2 font-serif text-4xl text-staff-strong">Content library</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-staff-body">
          The uploaded Excel is stored in this system. Staff can open every role’s questions
          here, download the current library, or upload a replacement file. When you invite a
          candidate, the paper is built from this bank.
        </p>
      </div>

      {query.error ? <p className="text-sm text-staff-accent">{query.error}</p> : null}
      {query.imported ? (
        <p className="text-sm text-staff-muted">Library imported. Open the questions below to review them.</p>
      ) : null}
      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          href="/console/library/questions"
          className="rounded-md bg-staff-accent px-4 py-2 font-medium text-staff-bg"
        >
          View questions by role
        </Link>
        <a
          href="/console/library/question-template?role=ALL"
          className="rounded-md border border-staff-line px-4 py-2 text-staff-strong"
        >
          Download current library Excel
        </a>
        <Link href="/console/library/configure" className="rounded-md border border-staff-line px-4 py-2 text-staff-strong">
          Upload or replace from Excel
        </Link>
      </div>

      <section className="rounded-lg border border-staff-line p-5">
        <h2 className="font-serif text-2xl text-staff-strong">Import master workbook</h2>
        <p className="mt-2 text-sm leading-6 text-staff-body">
          Use the updated question library Excel (role sheets plus COMMON).
          Candidates who already have a link keep the paper they were sent.
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
        <ConfirmForm
          action={importLibraryFile}
          message={
            "Replace the whole library?\n\nAll roles and questions will be reloaded from this file. Questions added or changed through Excel uploads will be lost.\n\nPapers already sent are not affected.\n\nClick OK to replace everything, or Cancel to stop."
          }
          className="mt-4 flex flex-wrap items-center gap-3"
        >
          <input
            type="file"
            name="file"
            accept=".xlsx"
            required
            className="text-sm text-staff-body"
          />
          <SubmitButton
            pendingText="Importing… this can take up to a minute"
            className="rounded-md bg-staff-accent px-4 py-2 text-sm font-medium text-staff-bg"
          >
            Import library
          </SubmitButton>
        </ConfirmForm>
        {latest ? (
          <p className="mt-3 text-xs uppercase tracking-[0.14em] break-all text-staff-muted">
            Last import: {latest.fileName} · {latest.importedAt.toLocaleString()} · {latest.libraryVersion}
          </p>
        ) : (
          <p className="mt-3 text-sm text-staff-muted">No library imported yet.</p>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link className="rounded-lg border border-staff-line p-4 hover:bg-staff-hover" href="/console/library/questions">
          <p className="text-xs uppercase tracking-[0.14em] text-staff-muted">Roles and levels you can invite</p>
          <p className="mt-2 font-serif text-3xl text-staff-strong">{roleTracks}</p>
        </Link>
        <Link className="rounded-lg border border-staff-line p-4 hover:bg-staff-hover" href="/console/library/questions">
          <p className="text-xs uppercase tracking-[0.14em] text-staff-muted">Questions in use</p>
          <p className="mt-2 font-serif text-3xl text-staff-strong">{questions}</p>
        </Link>
      </section>
    </div>
  );
}
