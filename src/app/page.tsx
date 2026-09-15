import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth";

export default async function Home() {
  const staff = await getStaffSession();
  redirect(staff ? "/console" : "/login");
}
