import Link from "next/link";
import { prisma } from "@/lib/db";
import { CandidateTable } from "@/components/CandidateTable";
import { requireStaff } from "@/lib/access";
import { can } from "@/lib/permissions";

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const staff = await requireStaff("viewCandidates");
  const { q = "", status = "" } = await searchParams;
  const evaluator = staff.role === "EVALUATOR";
  const submittedStatuses = ["COMPLETED", "REVIEWED", "DECIDED"];
  const statusFilter =
    evaluator && !submittedStatuses.includes(status) ? "" : status;
  const candidates = await prisma.candidate.findMany({
    where: {
      ...(evaluator
        ? { status: statusFilter || { in: submittedStatuses } }
        : statusFilter
          ? { status: statusFilter }
          : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { email: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      attempts: { orderBy: { startedAt: "desc" }, take: 1 },
      decisions: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-staff-muted">People</p>
          <h1 className="mt-2 font-serif text-4xl text-staff-strong">Candidates</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-staff-body">
            {evaluator
              ? "People who have submitted a test. Open a record to read the work and score it."
              : "Everyone invited, in progress, or decided. Open a record to see their paper, scores, and decision."}
          </p>
        </div>
        {can(staff.role, "invite") ? (
          <Link
            href="/console/candidates/new"
            className="rounded-md bg-staff-accent px-4 py-2 text-sm font-medium text-staff-bg"
          >
            Invite candidate
          </Link>
        ) : null}
      </div>

      <form className="flex flex-wrap gap-3" action="/console/candidates">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name or email"
          className="min-w-56 flex-1 rounded-md border border-staff-line bg-staff-bg px-3 py-2 text-sm text-staff-strong outline-none focus:border-staff-accent"
        />
        <select
          name="status"
          defaultValue={statusFilter}
          className="rounded-md border border-staff-line bg-staff-bg px-3 py-2 text-sm text-staff-strong"
        >
          <option value="">{evaluator ? "Submitted tests" : "All statuses"}</option>
          {evaluator ? null : (
            <>
              <option value="INVITED">Invited</option>
              <option value="IN_PROGRESS">In progress</option>
            </>
          )}
          <option value="COMPLETED">Awaiting review</option>
          <option value="REVIEWED">Reviewed</option>
          <option value="DECIDED">Decided</option>
        </select>
        <button className="rounded-md border border-staff-line px-4 py-2 text-sm text-staff-strong">
          Filter
        </button>
      </form>

      <p className="text-sm text-staff-muted">{candidates.length} people</p>
      <CandidateTable candidates={candidates} />
    </div>
  );
}
