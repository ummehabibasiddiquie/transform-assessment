import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { startAttempt } from "@/lib/actions";

export default async function CandidateIntroPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: {
      candidate: true,
      assessmentVersion: {
        include: {
          assessment: {
            include: { roleVersion: { include: { role: true } } },
          },
        },
      },
      attempts: true,
    },
  });
  if (!invite) notFound();

  const submitted = invite.attempts.some((item) => item.status === "SUBMITTED");
  const version = invite.assessmentVersion;
  const role = version.assessment.roleVersion.role;

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-2xl px-5 py-12 lg:py-20">
        <p className="text-xs uppercase tracking-[0.22em] text-ink-soft">TRANSFORM</p>
        <h1 className="mt-4 font-serif text-4xl tracking-tight">{role.name}</h1>
        <p className="mt-2 text-lg text-ink-soft">{version.assessment.name}</p>
        <p className="mt-6 text-sm text-ink-soft">
          Hello {invite.candidate.name}. Estimated time: {version.assessment.durationMin} minutes.
        </p>
        <div className="mt-8 space-y-4 rounded-lg border border-line bg-paper-2 p-5 text-base leading-7">
          <p>{version.instructions}</p>
          <p>{version.aiPolicy}</p>
        </div>
        {submitted ? (
          <p className="mt-8 text-sm">This assessment has already been submitted. Thank you.</p>
        ) : (
          <form action={startAttempt.bind(null, token)} className="mt-8">
            <button className="btn-primary rounded-md px-5 py-2.5 text-sm font-medium">
              I understand — start the simulation
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
