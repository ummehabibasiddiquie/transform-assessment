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
        <Link href="/console/library" className="text-sm text-[#d9784a]">
          Content library
        </Link>
        <h1 className="mt-3 font-serif text-4xl text-[#f3efe6]">Work simulations</h1>
        <p className="mt-3 text-sm leading-6 text-[#c8cdb8]">
          Families A, P, R, C, M and I from the V2 library. Click a variant to
          read the candidate text and the evaluator key.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          href="/console/library/simulations"
          className={`rounded-md px-3 py-1.5 ${family ? "text-[#c8cdb8]" : "bg-[#d9784a] text-[#121612]"}`}
        >
          All
        </Link>
        {families.map((item) => (
          <Link
            key={item.family}
            href={`/console/library/simulations?family=${encodeURIComponent(item.family)}`}
            className={`rounded-md px-3 py-1.5 ${
              family === item.family ? "bg-[#d9784a] text-[#121612]" : "text-[#c8cdb8]"
            }`}
          >
            {item.family || "Untitled"}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-[#9aa392]">Import the Excel library first.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[#2a332a]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#2a332a] text-xs uppercase tracking-[0.14em] text-[#9aa392]">
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
                <tr key={item.id} className="border-b border-[#2a332a] last:border-0">
                  <td className="px-4 py-3">
                    <Link className="text-[#d9784a] hover:underline" href={`/console/library/items/${item.id}`}>
                      {item.sourceId}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[#f3efe6]">{item.title}</td>
                  <td className="px-4 py-3 text-[#c8cdb8]">{item.family}</td>
                  <td className="px-4 py-3 text-[#c8cdb8]">{item.difficulty}</td>
                  <td className="px-4 py-3 text-[#9aa392]">{item.equivalentGroup}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
