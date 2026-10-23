import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth";
import { readStaffTheme, STAFF_THEME_COOKIE } from "@/lib/staff-theme";
import { StaffShell } from "@/components/StaffShell";

export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await getStaffSession();
  if (!staff) redirect("/login");
  const theme = readStaffTheme((await cookies()).get(STAFF_THEME_COOKIE)?.value);
  return (
    <StaffShell staff={staff} theme={theme}>
      {children}
    </StaffShell>
  );
}
