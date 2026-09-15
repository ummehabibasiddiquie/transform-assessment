import Link from "next/link";
import { prisma } from "@/lib/db";
import { CandidateTable } from "@/components/CandidateTable";

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q = "", status = "" } = await searchParams;
  const candidates = await prisma.candidate.findMany({
    where: {
      ...(status ? { status } : {}),
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
          <p className="text-xs uppercase tracking-[0.2em] text-[#9aa392]">People</p>
          <h1 className="mt-2 font-serif text-4xl text-[#f3efe6]">Candidates</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#c8cdb8]">
            Everyone invited, in progress, or decided. Open a record to see their
            paper, scores, and decision.
          </p>
        </div>
        <Link
          href="/console/candidates/new"
          className="rounded-md bg-[#d9784a] px-4 py-2 text-sm font-medium text-[#121612]"
        >
          Invite candidate
        </Link>
      </div>

      <form className="flex flex-wrap gap-3" action="/console/candidates">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name or email"
          className="min-w-56 flex-1 rounded-md border border-[#2a332a] bg-[#121612] px-3 py-2 text-sm text-[#f3efe6] outline-none focus:border-[#d9784a]"
        />
        <select
          name="status"
          defaultValue={status}
          className="rounded-md border border-[#2a332a] bg-[#121612] px-3 py-2 text-sm text-[#f3efe6]"
        >
          <option value="">All statuses</option>
          <option value="INVITED">Invited</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="COMPLETED">Awaiting review</option>
          <option value="REVIEWED">Reviewed</option>
          <option value="DECIDED">Decided</option>
        </select>
        <button className="rounded-md border border-[#2a332a] px-4 py-2 text-sm text-[#f3efe6]">
          Filter
        </button>
      </form>

      <p className="text-sm text-[#9aa392]">{candidates.length} people</p>
      <CandidateTable candidates={candidates} />
    </div>
  );
}
