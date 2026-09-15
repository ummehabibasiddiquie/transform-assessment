import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCandidateSession } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getCandidateSession();
  if (!session?.attemptId) {
    return NextResponse.json({ error: "Not signed in as a candidate." }, { status: 401 });
  }

  const body = (await request.json()) as {
    taskId?: string;
    content?: unknown;
    resourceLog?: unknown;
    sequence?: number;
  };
  if (!body.taskId) {
    return NextResponse.json({ error: "Missing task." }, { status: 400 });
  }

  const attempt = await prisma.attempt.findUnique({
    where: { id: session.attemptId },
  });
  if (!attempt || attempt.status === "SUBMITTED") {
    return NextResponse.json({ error: "This attempt can no longer be edited." }, { status: 403 });
  }

  await prisma.response.upsert({
    where: {
      attemptId_taskId: {
        attemptId: attempt.id,
        taskId: body.taskId,
      },
    },
    create: {
      attemptId: attempt.id,
      taskId: body.taskId,
      contentJson: JSON.stringify(body.content ?? {}),
      resourceLogJson: JSON.stringify(body.resourceLog ?? {}),
    },
    update: {
      contentJson: JSON.stringify(body.content ?? {}),
      resourceLogJson: JSON.stringify(body.resourceLog ?? {}),
      savedAt: new Date(),
    },
  });

  if (typeof body.sequence === "number") {
    await prisma.attempt.update({
      where: { id: attempt.id },
      data: { currentTaskSequence: body.sequence },
    });
  }

  return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });
}
