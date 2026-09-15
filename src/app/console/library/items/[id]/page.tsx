import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/access";
import { bankLabel } from "@/lib/library";

export default async function LibraryItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff("editAssessment");
  const { id } = await params;
  const item = await prisma.libraryContentItem.findUnique({ where: { id } });
  if (!item) notFound();

  const back =
    item.bank === "WORK_SIMULATION"
      ? "/console/library/simulations"
      : `/console/library/items?bank=${item.bank}`;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link href={back} className="text-sm text-[#d9784a]">
          Back to {bankLabel(item.bank)}
        </Link>
        <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[#9aa392]">
          {item.sourceId} · {bankLabel(item.bank)}
        </p>
        <h1 className="mt-2 font-serif text-4xl text-[#f3efe6]">{item.title || item.sourceId}</h1>
        <p className="mt-3 text-sm text-[#c8cdb8]">
          {item.family}
          {item.difficulty ? ` · Difficulty ${item.difficulty}` : ""}
          {item.equivalentGroup ? ` · ${item.equivalentGroup}` : ""}
        </p>
      </div>

      <section className="rounded-lg border border-[#2a332a] p-5">
        <h2 className="text-xs uppercase tracking-[0.16em] text-[#9aa392]">Candidate content</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#f3efe6]">
          {item.candidateText || "No candidate text in this row."}
        </p>
      </section>

      <section className="rounded-lg border border-[#2a332a] p-5">
        <h2 className="text-xs uppercase tracking-[0.16em] text-[#9aa392]">
          Evaluator key — never shown to candidates
        </h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#c8cdb8]">
          {item.evaluatorKey || "No evaluator key in this row."}
        </p>
        {item.evidenceKey ? (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#c8cdb8]">{item.evidenceKey}</p>
        ) : null}
      </section>

      <p className="text-xs text-[#9aa392]">
        AI policy: {item.aiPolicy || "Not set"} · Response: {item.responseType || "Not set"} · Status:{" "}
        {item.status}
      </p>
    </div>
  );
}
