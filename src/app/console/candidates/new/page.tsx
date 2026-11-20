import { inviteCandidate } from "@/lib/actions";
import { planTrackItems } from "@/lib/assemble";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/access";
import { PaperChoice } from "@/components/PaperChoice";
import { SubmitButton } from "@/components/SubmitButton";
import { defaultCompleteByInput, HR_CONTACT_EMAIL } from "@/lib/invite-email";
import { mailConfigured } from "@/lib/mail";
import { publishedPapersForInvite } from "@/lib/papers";

export const maxDuration = 60;

export default async function InvitePage() {
  await requireStaff("invite");
  const [tracks, items, papers] = await Promise.all([
    prisma.assessmentTrack.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ roleName: "asc" }, { level: "asc" }],
    }),
    prisma.bankItem.findMany({ where: { status: "APPROVED" } }),
    publishedPapersForInvite(prisma),
  ]);
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
        Choose a role to build a 60-minute paper from the question bank, or choose a
        staff paper made in Assessment designer. A paper already sent does not change
        later.
      </p>
      {mailConfigured() ? (
        <p className="mt-3 text-sm text-staff-muted">
          The invitation tells them not to reply to the sending address, and to
          contact {HR_CONTACT_EMAIL} instead.
        </p>
      ) : (
        <p className="mt-3 text-sm text-staff-accent">
          SMTP is not set, so the invite will still be created but the email
          will not send. Add SMTP_HOST, SMTP_USER, and SMTP_PASS, then use Send
          invitation email on the candidate record.
        </p>
      )}
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
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">
            Complete by (India time)
          </span>
          <input
            name="completeBy"
            type="datetime-local"
            required
            defaultValue={defaultCompleteByInput()}
            className="w-full rounded-md border border-staff-line bg-staff-bg px-3 py-2.5 text-staff-strong outline-none focus:border-staff-accent"
          />
        </label>
        <PaperChoice
          tracks={tracks.map((track) => ({
            value: track.code,
            label: `${track.roleName} — ${track.level}`,
          }))}
          papers={papers}
        />
        <SubmitButton
          pendingText="Building the paper…"
          className="rounded-md bg-staff-accent px-4 py-2.5 text-sm font-medium text-staff-bg"
        >
          Send invitation email
        </SubmitButton>
        {tracks.length === 0 ? (
          <p className="text-sm text-staff-accent">
            Import the content library before inviting.
          </p>
        ) : null}
      </form>
      <section className="mt-10">
        <h2 className="font-serif text-2xl text-staff-strong">If you select a role</h2>
        <p className="mt-2 text-sm leading-6 text-staff-body">
          The system builds a 60-minute paper from the bank: about 15 minutes aptitude,
          15 minutes problem solving, and 30 minutes role tasks.
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
