import Link from "next/link";
import { logoutStaff } from "@/lib/actions";
import type { StaffSession } from "@/lib/auth";

export function StaffShell({
  staff,
  children,
}: {
  staff: StaffSession;
  children: React.ReactNode;
}) {
  return (
    <div className="staff-body min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-[#2a332a] px-5 py-8 lg:block">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#9aa392]">
          TRANSFORM
        </p>
        <p className="mt-3 font-serif text-2xl text-[#f3efe6]">Hiring console</p>
        <nav className="mt-10 space-y-1 text-sm">
          <Link className="block rounded-md px-3 py-2 hover:bg-[#1c241c]" href="/console">
            Dashboard
          </Link>
          <Link className="block rounded-md px-3 py-2 hover:bg-[#1c241c]" href="/console/candidates">
            Candidates
          </Link>
          <Link className="block rounded-md px-3 py-2 hover:bg-[#1c241c]" href="/console/candidates/new">
            Invite candidate
          </Link>
          <Link className="block rounded-md px-3 py-2 hover:bg-[#1c241c]" href="/console/assessment">
            Tasks and questions
          </Link>
        </nav>
        <div className="absolute bottom-8 left-5 right-5 text-sm text-[#9aa392]">
          <p className="text-[#e7eadf]">{staff.name}</p>
          <p className="mt-0.5 text-xs uppercase tracking-[0.14em]">{staff.role.replaceAll("_", " ")}</p>
          <form action={logoutStaff} className="mt-4">
            <button className="text-xs uppercase tracking-[0.16em] text-[#d9784a]">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="lg:pl-60">
        <header className="flex items-center justify-between gap-3 border-b border-[#2a332a] px-5 py-4 lg:hidden">
          <p className="font-serif text-lg">Hiring console</p>
          <div className="flex gap-3 text-xs uppercase tracking-[0.14em] text-[#9aa392]">
            <Link href="/console/candidates">Candidates</Link>
            <Link href="/console/assessment">Tasks</Link>
          </div>
        </header>
        <div className="px-5 py-8 lg:px-10 lg:py-10">{children}</div>
      </div>
    </div>
  );
}
