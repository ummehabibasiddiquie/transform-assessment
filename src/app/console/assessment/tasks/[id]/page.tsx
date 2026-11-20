import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { saveTask } from "@/lib/content-actions";
import { TaskEditorForm } from "@/components/TaskEditorForm";
import { requireStaff } from "@/lib/access";
import { designerUrl } from "@/lib/papers";

export default async function EditTaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ trackCode?: string; paperId?: string }>;
}) {
  await requireStaff("editAssessment");
  const { id } = await params;
  const { trackCode, paperId } = await searchParams;
  const task = await prisma.task.findUnique({
    where: { id },
    include: { assessmentVersion: true },
  });
  if (!task) notFound();
  if (
    task.assessmentVersion.status !== "DRAFT" &&
    task.assessmentVersion.status !== "PRIVATE"
  ) {
    notFound();
  }
  const backId = paperId || task.assessmentVersion.assessmentId;

  return (
    <div className="max-w-2xl">
      <Link href={designerUrl(trackCode, backId)} className="text-sm text-staff-accent">
        Back to paper
      </Link>
      <p className="mt-4 text-xs uppercase tracking-[0.2em] text-staff-muted">
        Task {task.sequence}
      </p>
      <h1 className="mt-2 mb-8 font-serif text-4xl text-staff-strong">Edit question</h1>
      <TaskEditorForm
        action={saveTask}
        versionId={task.assessmentVersionId}
        task={task}
        trackCode={trackCode}
        paperId={backId}
        submitLabel="Save question"
      />
    </div>
  );
}
