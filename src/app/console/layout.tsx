import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth";
import { StaffShell } from "@/components/StaffShell";

export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await getStaffSession();
  if (!staff) redirect("/login");
  return <StaffShell staff={staff}>{children}</StaffShell>;
}
