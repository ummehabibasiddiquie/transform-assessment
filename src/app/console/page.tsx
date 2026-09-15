import Link from "next/link";
import { requireStaff } from "@/lib/access";
import { prisma } from "@/lib/db";
import { CandidateTable } from "@/components/CandidateTable";

export default async function ConsoleHome() {
  await requireStaff("viewDashboard");
  const [roles, publishedVersions, candidates] = await Promise.all([
    prisma.role.count({ where: { status: "ACTIVE" } }),
    prisma.assessmentVersion.count({ where: { status: "PUBLISHED" } }),
    prisma.candidate.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        attempts: { orderBy: { startedAt: "desc" }, take: 1 },
        decisions: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
  ]);

  const invited = candidates.filter((c) => c.status === "INVITED").length;
  const inProgress = candidates.filter((c) => c.status === "IN_PROGRESS").length;
  const awaiting = candidates.filter((c) => c.status === "COMPLETED");
  const decided = candidates.filter((c) => c.status === "DECIDED").length;
  const scored = candidates
    .map((c) => c.attempts[0]?.overallScore)
    .filter((score): score is number => typeof score === "number");
  const average =
    scored.length > 0
      ? Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 10) / 10
      : null;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#9aa392]">
            Operations Executive
          </p>
          <h1 className="mt-2 font-serif text-4xl text-[#f3efe6]">Dashboard</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#c8cdb8]">
            Snapshot of hiring work. Open Candidates for the full list, or Tasks
            to change questions without a developer.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/console/candidates"
            className="rounded-md border border-[#2a332a] px-4 py-2 text-sm text-[#f3efe6]"
          >
            All candidates
          </Link>
          <Link
            href="/console/candidates/new"
            className="rounded-md bg-[#d9784a] px-4 py-2 text-sm font-medium text-[#121612]"
          >
            Invite candidate
          </Link>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Active roles" value={String(roles)} />
        <Stat label="Published papers" value={String(publishedVersions)} />
        <Stat label="Awaiting review" value={String(awaiting.length)} />
        <Stat label="Average score" value={average == null ? "—" : `${average}`} />
      </section>

      <section className="grid gap-3 sm:grid-cols-4">
        <Stat label="Invited" value={String(invited)} />
        <Stat label="In progress" value={String(inProgress)} />
        <Stat label="Decided" value={String(decided)} />
        <Stat label="Need action" value={String(awaiting.length)} />
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-serif text-2xl text-[#f3efe6]">Needs reviewer action</h2>
          <Link className="text-sm text-[#d9784a]" href="/console/candidates?status=COMPLETED">
            View all candidates
          </Link>
        </div>
        <CandidateTable candidates={awaiting} />
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#2a332a] bg-[#171c17] px-4 py-4">
      <p className="text-xs uppercase tracking-[0.16em] text-[#9aa392]">{label}</p>
      <p className="mt-2 font-serif text-3xl text-[#f3efe6]">{value}</p>
    </div>
  );
}
