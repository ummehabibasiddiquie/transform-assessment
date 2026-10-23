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
        <Link href="/console/library" className="text-sm text-staff-accent">
          Content library
        </Link>
        <h1 className="mt-3 font-serif text-4xl text-staff-strong">Role library</h1>
        <p className="mt-3 text-sm leading-6 text-staff-body">
          These role/level profiles come from the imported workbook. New roles
          should be added in the library, not hard-coded in the candidate screens.
        </p>
      </div>

      {roles.length === 0 ? (
        <p className="text-sm text-staff-muted">Import the Excel library first.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-staff-line">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-staff-line text-xs uppercase tracking-[0.14em] text-staff-muted">
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
                <tr key={role.id} className="border-b border-staff-line last:border-0 align-top">
                  <td className="px-4 py-3 text-staff-muted">{role.sourceId}</td>
                  <td className="px-4 py-3 text-staff-strong">
                    {role.name}
                    <p className="mt-1 text-xs text-staff-body">{role.profile}</p>
                  </td>
                  <td className="px-4 py-3 text-staff-body">
                    {role.level}
                    <p className="mt-1 text-xs">{role.experienceBand}</p>
                  </td>
                  <td className="px-4 py-3 text-staff-body">{role.coreCapabilities}</td>
                  <td className="px-4 py-3 text-staff-body">
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
