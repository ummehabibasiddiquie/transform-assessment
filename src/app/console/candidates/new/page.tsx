import { inviteCandidate } from "@/lib/actions";
import { planTrackItems } from "@/lib/assemble";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/access";
import { PaperChoice } from "@/components/PaperChoice";

export const maxDuration = 60;

export default async function InvitePage() {
  await requireStaff("invite");
  const [versions, tracks, items] = await Promise.all([
    prisma.assessmentVersion.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { version: "desc" },
      include: { tasks: true, assessment: true },
    }),
    prisma.assessmentTrack.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ roleName: "asc" }, { level: "asc" }],
    }),
    prisma.bankItem.findMany({ where: { status: "APPROVED" } }),
  ]);
  const fixedPapers = versions.filter((version) => version.tasks.every((task) => !task.sourceId));
  const plans = tracks.map((track) => {
    const plan = planTrackItems(track, items, new Set());
    return {
      code: track.code,
      roleName: track.roleName,
      level: track.level,
      aptitude: plan.aptitude.length,
      problemSolving: plan.problemSolving.length,
      role: plan.role.length,
    };
  });

  return (
    <div className="max-w-3xl">
      <p className="text-xs uppercase tracking-[0.2em] text-staff-muted">
        Candidate access
      </p>
      <h1 className="mt-2 font-serif text-4xl text-staff-strong">Invite a candidate</h1>
        <p className="mt-4 text-sm leading-6 text-staff-body">
        After you save, copy the private link. Choose a role and level and the
        system builds that paper: shared aptitude, shared problem solving, then
        that role’s questions. A paper already sent does not change later.
      </p>
      <form action={inviteCandidate} className="mt-8 space-y-5">
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">
            Full name
          </span>
          <input
            name="name"
            required
            className="w-full rounded-md border border-staff-line bg-staff-bg px-3 py-2.5 text-staff-strong outline-none focus:border-staff-accent"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">
            Email
          </span>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-md border border-staff-line bg-staff-bg px-3 py-2.5 text-staff-strong outline-none focus:border-staff-accent"
          />
        </label>
        <PaperChoice
          tracks={tracks.map((track) => ({
            value: track.code,
            label: `${track.roleName} — ${track.level}`,
          }))}
          papers={fixedPapers.map((version) => ({
            value: version.id,
            label: `${version.assessment.name} · v${version.version} · ${version.tasks.length} tasks`,
          }))}
        />
        <button className="rounded-md bg-staff-accent px-4 py-2.5 text-sm font-medium text-staff-bg">
          Create assessment link
        </button>
        {fixedPapers.length === 0 && tracks.length === 0 ? (
          <p className="text-sm text-staff-accent">
            Import the content library before inviting.
          </p>
        ) : null}
      </form>
      <section className="mt-10">
        <h2 className="font-serif text-2xl text-staff-strong">Paper each role will build</h2>
        <p className="mt-2 text-sm leading-6 text-staff-body">
          A new invite copies these questions into a fixed paper. Changing the library later does not change a link that was already created. The same email invited again gets different shared questions when the bank has enough unused ones.
        </p>
        <table className="mt-4 w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.14em] text-staff-muted">
            <tr>
              <th className="py-2 pr-3 font-medium">Role and level</th>
              <th className="py-2 pr-3 font-medium">Aptitude</th>
              <th className="py-2 pr-3 font-medium">Problem solving</th>
              <th className="py-2 font-medium">Role tasks</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.code} className="border-t border-staff-line text-staff-text">
                <td className="py-2 pr-3">
                  {plan.roleName} — {plan.level}
                </td>
                <td className="py-2 pr-3">{plan.aptitude}</td>
                <td className="py-2 pr-3">{plan.problemSolving}</td>
                <td className="py-2">{plan.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
