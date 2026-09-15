import { prisma } from "@/lib/db";

export default async function DonePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { candidate: true },
  });

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-xl px-5 py-20">
        <p className="text-xs uppercase tracking-[0.22em] text-ink-soft">TRANSFORM</p>
        <h1 className="mt-4 font-serif text-4xl">Thank you{invite ? `, ${invite.candidate.name}` : ""}.</h1>
        <p className="mt-6 text-base leading-7 text-ink-soft">
          Your work has been submitted. The hiring team will review the evidence.
          You will not see scores or a hiring recommendation here.
        </p>
      </div>
    </main>
  );
}
