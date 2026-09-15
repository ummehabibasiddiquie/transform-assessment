import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth";
import { can, homePath, type Permission } from "@/lib/permissions";

export async function requireStaff(permission?: Permission) {
  const staff = await getStaffSession();
  if (!staff) redirect("/login");
  if (permission && !can(staff.role, permission)) {
    redirect(homePath(staff.role));
  }
  return staff;
}
