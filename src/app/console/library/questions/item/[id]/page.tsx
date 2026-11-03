import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/access";
import { saveBankQuestion } from "@/lib/library-actions";
import { optionsText } from "@/lib/question-sheet";
import { SubmitButton } from "@/components/SubmitButton";

const inputClass =
  "w-full rounded-md border border-staff-line bg-staff-bg px-3 py-2.5 text-staff-strong outline-none focus:border-staff-accent";

export default async function BankQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff("editAssessment");
  const { id } = await params;
  const item = await prisma.bankItem.findUnique({
    where: { id },
    include: { track: true },
  });
  if (!item) notFound();
  const role = item.module === "ROLE" ? (item.track?.code ?? "COMMON") : "COMMON";

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <Link href={`/console/library/questions/role/${role}`} className="text-sm text-staff-accent">
          Back to {item.track ? `${item.track.roleName} — ${item.track.level}` : "common questions"}
        </Link>
        <p className="mt-3 text-xs uppercase tracking-[0.2em] text-staff-muted">{item.sourceId}</p>
        <h1 className="mt-2 font-serif text-4xl text-staff-strong">Edit question</h1>
        <p className="mt-2 text-sm text-staff-body">
          Changes apply to new invites only. Papers already sent stay as they were.
        </p>
      </div>

      <form action={saveBankQuestion} className="space-y-5">
        <input type="hidden" name="id" value={item.id} />
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">Title</span>
          <input name="title" required defaultValue={item.title} className={inputClass} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">Question</span>
          <textarea name="prompt" required rows={8} defaultValue={item.prompt} className={inputClass} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">
            Options (one per line, such as A. Yes)
          </span>
          <textarea name="options" rows={6} defaultValue={optionsText(item.optionsJson)} className={inputClass} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">Answer key</span>
          <textarea name="answerKey" rows={4} defaultValue={item.answerKey} className={inputClass} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">Type</span>
            <select name="responseType" defaultValue={item.responseType} className={inputClass}>
              {["MCQ", "MULTI_SELECT", "NUMERIC", "SHORT", "RANKING", "CLASSIFICATION", "MATCHING", "PRACTICAL"].map(
                (type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">Status</span>
            <select name="status" defaultValue={item.status} className={inputClass}>
              <option value="APPROVED">Active</option>
              <option value="RETIRED">Retired</option>
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">Competency</span>
            <input name="competency" defaultValue={item.competency} className={inputClass} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">Difficulty</span>
            <input name="difficulty" defaultValue={item.difficulty} className={inputClass} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">Minutes</span>
            <input
              name="timeLimitMin"
              type="number"
              defaultValue={item.timeLimitMin ?? 2}
              className={inputClass}
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm text-staff-body">
          <input type="checkbox" name="aiAllowed" defaultChecked={item.aiAllowed} />
          AI allowed
        </label>
        <label className="flex items-center gap-2 text-sm text-staff-body">
          <input type="checkbox" name="searchAllowed" defaultChecked={item.searchAllowed} />
          Search allowed
        </label>
        <SubmitButton
          pendingText="Saving…"
          className="rounded-md bg-staff-accent px-4 py-2.5 text-sm font-medium text-staff-bg"
        >
          Save question
        </SubmitButton>
      </form>
    </div>
  );
}
