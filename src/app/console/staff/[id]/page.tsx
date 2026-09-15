import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { deleteStaff, updateStaff } from "@/lib/actions";
import { requireStaff } from "@/lib/access";
import { roleLabel, STAFF_ROLES } from "@/lib/permissions";
import { PasswordInput } from "@/components/PasswordInput";

export default async function EditStaffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staff = await requireStaff("manageStaff");
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) notFound();

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <Link href="/console/staff" className="text-sm text-[#d9784a]">
          All staff
        </Link>
        <h1 className="mt-3 font-serif text-4xl text-[#f3efe6]">Edit staff user</h1>
        <p className="mt-3 text-sm leading-6 text-[#c8cdb8]">
          Leave the password blank to keep the current one.
        </p>
      </div>

      <form action={updateStaff} className="space-y-4">
        <input type="hidden" name="userId" value={user.id} />
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-[0.16em] text-[#9aa392]">Full name</span>
          <input
            name="name"
            required
            defaultValue={user.name}
            className="w-full rounded-md border border-[#2a332a] bg-[#121612] px-3 py-2.5 text-[#f3efe6]"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-[0.16em] text-[#9aa392]">Work email</span>
          <input
            name="email"
            type="email"
            required
            defaultValue={user.email}
            className="w-full rounded-md border border-[#2a332a] bg-[#121612] px-3 py-2.5 text-[#f3efe6]"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-[0.16em] text-[#9aa392]">
            New password (optional)
          </span>
          <PasswordInput
            name="password"
            minLength={8}
            className="rounded-md border border-[#2a332a] bg-[#121612] px-3 py-2.5 text-[#f3efe6]"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-[0.16em] text-[#9aa392]">Application role</span>
          <select
            name="role"
            required
            defaultValue={user.role}
            className="w-full rounded-md border border-[#2a332a] bg-[#121612] px-3 py-2.5 text-[#f3efe6]"
          >
            {STAFF_ROLES.map((role) => (
              <option key={role} value={role}>
                {roleLabel(role)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-[#c8cdb8]">
          <input type="checkbox" name="active" defaultChecked={user.active} />
          Can sign in
        </label>
        <button className="rounded-md bg-[#d9784a] px-4 py-2.5 text-sm font-medium text-[#121612]">
          Save changes
        </button>
      </form>

      {user.id !== staff.userId ? (
        <form action={deleteStaff}>
          <input type="hidden" name="userId" value={user.id} />
          <button className="text-sm text-[#9aa392]">
            Delete this staff user
          </button>
        </form>
      ) : (
        <p className="text-sm text-[#9aa392]">You cannot delete your own account.</p>
      )}
    </div>
  );
}
