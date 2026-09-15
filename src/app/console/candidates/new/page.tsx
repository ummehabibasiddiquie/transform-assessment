import { inviteCandidate } from "@/lib/actions";
import { prisma } from "@/lib/db";

export default async function InvitePage() {
  const versions = await prisma.assessmentVersion.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { version: "desc" },
    include: { tasks: true, assessment: true },
  });
  const latest = versions[0];

  return (
    <div className="max-w-xl">
      <p className="text-xs uppercase tracking-[0.2em] text-[#9aa392]">
        Candidate access
      </p>
      <h1 className="mt-2 font-serif text-4xl text-[#f3efe6]">Invite a candidate</h1>
      <p className="mt-4 text-sm leading-6 text-[#c8cdb8]">
        After you save, copy the private link. Choose which published paper they
        should sit. Editing tasks later will not change papers already sent.
      </p>
      <form action={inviteCandidate} className="mt-8 space-y-5">
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-[0.16em] text-[#9aa392]">
            Full name
          </span>
          <input
            name="name"
            required
            className="w-full rounded-md border border-[#2a332a] bg-[#121612] px-3 py-2.5 text-[#f3efe6] outline-none focus:border-[#d9784a]"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-[0.16em] text-[#9aa392]">
            Email
          </span>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-md border border-[#2a332a] bg-[#121612] px-3 py-2.5 text-[#f3efe6] outline-none focus:border-[#d9784a]"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-[0.16em] text-[#9aa392]">
            Paper to assign
          </span>
          <select
            name="assessmentVersionId"
            defaultValue={latest?.id}
            required
            className="w-full rounded-md border border-[#2a332a] bg-[#121612] px-3 py-2.5 text-[#f3efe6]"
          >
            {versions.map((version) => (
              <option key={version.id} value={version.id}>
                {version.assessment.name} · v{version.version} · {version.tasks.length} tasks
              </option>
            ))}
          </select>
        </label>
        <button className="rounded-md bg-[#d9784a] px-4 py-2.5 text-sm font-medium text-[#121612]">
          Create assessment link
        </button>
        {versions.length === 0 ? (
          <p className="text-sm text-[#d9784a]">
            Publish a paper under Tasks and questions before inviting.
          </p>
        ) : null}
      </form>
    </div>
  );
}
