import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { questionTemplateBuffer, roleQuestionsBuffer } from "@/lib/question-sheet";

export async function GET(request: Request) {
  const staff = await getStaffSession();
  if (!staff || !can(staff.role, "editAssessment")) {
    return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  }
  const role = new URL(request.url).searchParams.get("role");
  const exported = role ? await roleQuestionsBuffer(prisma, role) : null;
  if (role && !exported) {
    return NextResponse.json({ error: "Role not found." }, { status: 404 });
  }
  const body = exported ?? questionTemplateBuffer();
  const filename = role ? `${role}-questions.xlsx` : "role-questions-template.xlsx";
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
