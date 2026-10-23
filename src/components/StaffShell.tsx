import Link from "next/link";
import { logoutStaff } from "@/lib/actions";
import type { StaffSession } from "@/lib/auth";
import { can, roleLabel, STAFF_NAV, workspaceLabel } from "@/lib/permissions";
import type { StaffTheme } from "@/lib/staff-theme";
import { ThemeToggle } from "@/components/ThemeToggle";

export function StaffShell({
  staff,
  theme,
  children,
}: {
  staff: StaffSession;
  theme: StaffTheme | null;
  children: React.ReactNode;
}) {
  const links = STAFF_NAV.filter((item) => can(staff.role, item.permission));

  return (
    <div className="staff-body min-h-screen" data-theme={theme ?? undefined}>
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-staff-line px-5 py-8 lg:block">
        <p className="text-[11px] uppercase tracking-[0.22em] text-staff-muted">
          TRANSFORM
        </p>
        <p className="mt-3 font-serif text-2xl text-staff-strong">
          {workspaceLabel(staff.role)}
        </p>
        <nav className="mt-10 space-y-1 text-sm">
          {links.map((item) => (
            <Link
              key={item.href}
              className="block rounded-md px-3 py-2 hover:bg-staff-hover"
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-8 left-5 right-5 text-sm text-staff-muted">
          <div className="mb-5">
            <ThemeToggle initial={theme} />
          </div>
          <p className="text-staff-text">{staff.name}</p>
          <p className="mt-0.5 text-xs uppercase tracking-[0.14em]">
            {roleLabel(staff.role)}
          </p>
          <form action={logoutStaff} className="mt-4">
            <button className="text-xs uppercase tracking-[0.16em] text-staff-accent">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="lg:pl-60">
        <header className="flex items-center justify-between gap-3 border-b border-staff-line px-5 py-4 lg:hidden">
          <p className="font-serif text-lg">{workspaceLabel(staff.role)}</p>
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.14em] text-staff-muted">
            {links.slice(0, 3).map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
            <ThemeToggle initial={theme} />
          </div>
        </header>
        <div className="px-5 py-8 lg:px-10 lg:py-10">{children}</div>
      </div>
    </div>
  );
}
