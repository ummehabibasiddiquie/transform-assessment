import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/access";

export default async function LibrarySimulationsPage({
  searchParams,
}: {
  searchParams: Promise<{ family?: string }>;
}) {
  await requireStaff("editAssessment");
  const { family } = await searchParams;
  const items = await prisma.libraryContentItem.findMany({
    where: {
      bank: "WORK_SIMULATION",
      ...(family ? { family } : {}),
    },
    orderBy: { sourceId: "asc" },
  });
  const families = await prisma.libraryContentItem.findMany({
    where: { bank: "WORK_SIMULATION" },
    distinct: ["family"],
    select: { family: true },
    orderBy: { family: "asc" },
  });

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <Link href="/console/library" className="text-sm text-staff-accent">
          Content library
        </Link>
        <h1 className="mt-3 font-serif text-4xl text-staff-strong">Work simulations</h1>
        <p className="mt-3 text-sm leading-6 text-staff-body">
          Families A, P, R, C, M and I from the V2 library. Click a variant to
          read the candidate text and the evaluator key.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          href="/console/library/simulations"
          className={`rounded-md px-3 py-1.5 ${family ? "text-staff-body" : "bg-staff-accent text-staff-bg"}`}
        >
          All
        </Link>
        {families.map((item) => (
          <Link
            key={item.family}
            href={`/console/library/simulations?family=${encodeURIComponent(item.family)}`}
            className={`rounded-md px-3 py-1.5 ${
              family === item.family ? "bg-staff-accent text-staff-bg" : "text-staff-body"
            }`}
          >
            {item.family || "Untitled"}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-staff-muted">Import the Excel library first.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-staff-line">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-staff-line text-xs uppercase tracking-[0.14em] text-staff-muted">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Theme</th>
                <th className="px-4 py-3 font-medium">Family</th>
                <th className="px-4 py-3 font-medium">Difficulty</th>
                <th className="px-4 py-3 font-medium">Group</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-staff-line last:border-0">
                  <td className="px-4 py-3">
                    <Link className="text-staff-accent hover:underline" href={`/console/library/items/${item.id}`}>
                      {item.sourceId}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-staff-strong">{item.title}</td>
                  <td className="px-4 py-3 text-staff-body">{item.family}</td>
                  <td className="px-4 py-3 text-staff-body">{item.difficulty}</td>
                  <td className="px-4 py-3 text-staff-muted">{item.equivalentGroup}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
