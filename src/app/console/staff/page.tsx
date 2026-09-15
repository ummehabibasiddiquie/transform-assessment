import Link from "next/link";
import { prisma } from "@/lib/db";
import { createStaff, deleteStaff } from "@/lib/actions";
import { requireStaff } from "@/lib/access";
import { roleLabel, STAFF_ROLES } from "@/lib/permissions";

export default async function StaffPage() {
  const staff = await requireStaff("manageStaff");
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, active: true },
  });

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#9aa392]">Admin console</p>
        <h1 className="mt-2 font-serif text-4xl text-[#f3efe6]">Staff users</h1>
        <p className="mt-3 text-sm leading-6 text-[#c8cdb8]">
          There is no public registration. Add hiring-team accounts here. Candidates
          are invited separately and never use this page.
        </p>
      </div>

      <section className="overflow-hidden rounded-lg border border-[#2a332a]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#2a332a] text-xs uppercase tracking-[0.14em] text-[#9aa392]">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Access</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-[#2a332a] last:border-0">
                <td className="px-4 py-3 text-[#f3efe6]">{user.name}</td>
                <td className="px-4 py-3 text-[#c8cdb8]">{user.email}</td>
                <td className="px-4 py-3 text-[#c8cdb8]">{roleLabel(user.role)}</td>
                <td className="px-4 py-3 text-[#c8cdb8]">
                  {user.active ? "Active" : "Inactive"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <Link className="text-[#d9784a] hover:underline" href={`/console/staff/${user.id}`}>
                      Edit
                    </Link>
                    {user.id !== staff.userId ? (
                      <form action={deleteStaff}>
                        <input type="hidden" name="userId" value={user.id} />
                        <button className="text-[#9aa392] hover:underline">Delete</button>
                      </form>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="font-serif text-2xl text-[#f3efe6]">Add a staff person</h2>
        <form action={createStaff} className="mt-5 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-[0.16em] text-[#9aa392]">Full name</span>
            <input
              name="name"
              required
              className="w-full rounded-md border border-[#2a332a] bg-[#121612] px-3 py-2.5 text-[#f3efe6]"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-[0.16em] text-[#9aa392]">Work email</span>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-md border border-[#2a332a] bg-[#121612] px-3 py-2.5 text-[#f3efe6]"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-[0.16em] text-[#9aa392]">Password</span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              className="w-full rounded-md border border-[#2a332a] bg-[#121612] px-3 py-2.5 text-[#f3efe6]"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-[0.16em] text-[#9aa392]">Application role</span>
            <select
              name="role"
              required
              defaultValue="EVALUATOR"
              className="w-full rounded-md border border-[#2a332a] bg-[#121612] px-3 py-2.5 text-[#f3efe6]"
            >
              {STAFF_ROLES.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
          </label>
          <button className="rounded-md bg-[#d9784a] px-4 py-2.5 text-sm font-medium text-[#121612]">
            Create staff account
          </button>
        </form>
      </section>
    </div>
  );
}
