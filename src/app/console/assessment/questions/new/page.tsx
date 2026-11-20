import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/access";
import { addBankQuestion } from "@/lib/library-actions";
import { SubmitButton } from "@/components/SubmitButton";

const inputClass =
  "w-full rounded-md border border-staff-line bg-staff-bg px-3 py-2.5 text-staff-strong outline-none focus:border-staff-accent";

export default async function NewRoleQuestionPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  await requireStaff("editAssessment");
  const { role: roleCode } = await searchParams;
  const track = roleCode
    ? await prisma.assessmentTrack.findUnique({ where: { code: roleCode } })
    : null;
  if (!track) notFound();
  const returnTo = `/console/assessment?role=${encodeURIComponent(track.code)}`;

  return (
    <div className="max-w-2xl">
      <Link href={returnTo} className="text-sm text-staff-accent">
        Back to {track.roleName} — {track.level}
      </Link>
      <p className="mt-4 text-xs uppercase tracking-[0.2em] text-staff-muted">Assessment designer</p>
      <h1 className="mt-2 font-serif text-4xl text-staff-strong">Add a question</h1>
      <p className="mt-3 mb-8 text-sm leading-6 text-staff-body">
        This is added to the live bank for this role. New invites can use it. Papers already
        sent stay as they were.
      </p>
      <form action={addBankQuestion} className="space-y-5">
        <input type="hidden" name="trackCode" value={track.code} />
        <input type="hidden" name="module" value="ROLE" />
        <input type="hidden" name="returnTo" value={returnTo} />
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">Title</span>
          <input name="title" required className={inputClass} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">Question</span>
          <textarea name="prompt" required rows={8} className={inputClass} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">Type</span>
          <select name="responseType" defaultValue="SHORT" className={inputClass}>
            {["MCQ", "SHORT", "PRACTICAL", "MULTI_SELECT", "NUMERIC"].map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">
            Options (one per line, for MCQ)
          </span>
          <textarea name="options" rows={4} className={inputClass} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">Answer key</span>
          <textarea name="answerKey" rows={3} className={inputClass} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">Minutes</span>
          <input name="timeLimitMin" type="number" defaultValue={2} min={1} max={30} className={inputClass} />
        </label>
        <SubmitButton
          pendingText="Adding…"
          className="rounded-md bg-staff-accent px-4 py-2.5 text-sm font-medium text-staff-bg"
        >
          Add to this paper
        </SubmitButton>
      </form>
    </div>
  );
}
