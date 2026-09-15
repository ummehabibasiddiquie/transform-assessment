import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/access";

export default async function LibraryRolesPage() {
  await requireStaff("editAssessment");
  const roles = await prisma.libraryRole.findMany({
    orderBy: [{ name: "asc" }, { level: "asc" }],
  });
  const blueprints = await prisma.libraryBlueprint.groupBy({
    by: ["roleName", "level"],
    _count: { _all: true },
  });
  const blueprintCount = Object.fromEntries(
    blueprints.map((row) => [`${row.roleName}|${row.level}`, row._count._all]),
  );

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <Link href="/console/library" className="text-sm text-[#d9784a]">
          Content library
        </Link>
        <h1 className="mt-3 font-serif text-4xl text-[#f3efe6]">Role library</h1>
        <p className="mt-3 text-sm leading-6 text-[#c8cdb8]">
          These role/level profiles come from the imported workbook. New roles
          should be added in the library, not hard-coded in the candidate screens.
        </p>
      </div>

      {roles.length === 0 ? (
        <p className="text-sm text-[#9aa392]">Import the Excel library first.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[#2a332a]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#2a332a] text-xs uppercase tracking-[0.14em] text-[#9aa392]">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Level</th>
                <th className="px-4 py-3 font-medium">Capabilities</th>
                <th className="px-4 py-3 font-medium">Blueprint rows</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id} className="border-b border-[#2a332a] last:border-0 align-top">
                  <td className="px-4 py-3 text-[#9aa392]">{role.sourceId}</td>
                  <td className="px-4 py-3 text-[#f3efe6]">
                    {role.name}
                    <p className="mt-1 text-xs text-[#c8cdb8]">{role.profile}</p>
                  </td>
                  <td className="px-4 py-3 text-[#c8cdb8]">
                    {role.level}
                    <p className="mt-1 text-xs">{role.experienceBand}</p>
                  </td>
                  <td className="px-4 py-3 text-[#c8cdb8]">{role.coreCapabilities}</td>
                  <td className="px-4 py-3 text-[#c8cdb8]">
                    {blueprintCount[`${role.name}|${role.level}`] ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
