import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth";
import { homePath } from "@/lib/permissions";

export default async function Home() {
  const staff = await getStaffSession();
  redirect(staff ? homePath(staff.role) : "/login");
}
