import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/access";
import { BANK_LABELS, CONTENT_BANKS, type ContentBank } from "@/lib/library";

export default async function LibraryItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ bank?: string }>;
}) {
  await requireStaff("editAssessment");
  const query = await searchParams;
  const bank = CONTENT_BANKS.includes(query.bank as ContentBank)
    ? (query.bank as ContentBank)
    : "OBJECTIVE";
  const items = await prisma.libraryContentItem.findMany({
    where: { bank },
    orderBy: { sourceId: "asc" },
    take: 400,
  });

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <Link href="/console/library" className="text-sm text-staff-accent">
          Content library
        </Link>
        <h1 className="mt-3 font-serif text-4xl text-staff-strong">{BANK_LABELS[bank]}</h1>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {CONTENT_BANKS.map((item) => (
          <Link
            key={item}
            href={`/console/library/items?bank=${item}`}
            className={`rounded-md px-3 py-1.5 ${
              bank === item ? "bg-staff-accent text-staff-bg" : "text-staff-body"
            }`}
          >
            {BANK_LABELS[item]}
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
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Family</th>
                <th className="px-4 py-3 font-medium">Difficulty</th>
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
                  <td className="px-4 py-3 text-staff-strong">{item.title || item.family}</td>
                  <td className="px-4 py-3 text-staff-body">{item.family}</td>
                  <td className="px-4 py-3 text-staff-body">{item.difficulty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
