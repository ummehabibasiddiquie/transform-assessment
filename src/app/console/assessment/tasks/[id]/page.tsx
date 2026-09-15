import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { saveTask } from "@/lib/content-actions";
import { TaskEditorForm } from "@/components/TaskEditorForm";

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  return (
    <div className="max-w-2xl">
      <p className="text-xs uppercase tracking-[0.2em] text-[#9aa392]">
        Slot {task.sequence}
      </p>
      <h1 className="mt-2 mb-8 font-serif text-4xl text-[#f3efe6]">Edit task</h1>
      <TaskEditorForm
        action={saveTask}
        versionId={task.assessmentVersionId}
        task={task}
        submitLabel="Save task"
      />
    </div>
  );
}
