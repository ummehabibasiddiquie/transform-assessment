import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { createTask } from "@/lib/content-actions";
import { TaskEditorForm } from "@/components/TaskEditorForm";
import { requireStaff } from "@/lib/access";

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ versionId?: string; candidateId?: string }>;
}) {
  await requireStaff("editAssessment");
  const { versionId, candidateId } = await searchParams;
  if (!versionId) notFound();
  const version = await prisma.assessmentVersion.findUnique({
    where: { id: versionId },
  });
  if (!version || (version.status !== "DRAFT" && version.status !== "PRIVATE")) {
    notFound();
  }

  return (
    <div className="max-w-2xl">
      <p className="text-xs uppercase tracking-[0.2em] text-[#9aa392]">Task bank</p>
      <h1 className="mt-2 font-serif text-4xl text-[#f3efe6]">Add a task</h1>
      <p className="mt-3 mb-8 text-sm leading-6 text-[#c8cdb8]">
        This is added only to this paper version. Other candidates keep their own
        tasks unless you publish this as the shared template.
      </p>
      <TaskEditorForm
        action={createTask}
        versionId={version.id}
        candidateId={candidateId}
        submitLabel="Add task"
      />
    </div>
  );
}
