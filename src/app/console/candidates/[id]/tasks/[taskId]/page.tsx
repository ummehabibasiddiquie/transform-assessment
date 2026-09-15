import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { saveTask } from "@/lib/content-actions";
import { TaskEditorForm } from "@/components/TaskEditorForm";

export default async function CandidateTaskEditPage({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>;
}) {
  const { id, taskId } = await params;
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assessmentVersion: true },
  });
  if (!task || task.assessmentVersion.status !== "PRIVATE") notFound();

  return (
    <div className="max-w-2xl">
      <p className="text-xs uppercase tracking-[0.2em] text-[#9aa392]">
        Private paper · slot {task.sequence}
      </p>
      <h1 className="mt-2 mb-8 font-serif text-4xl text-[#f3efe6]">Edit this person’s task</h1>
      <TaskEditorForm
        action={saveTask}
        versionId={task.assessmentVersionId}
        candidateId={id}
        task={task}
        submitLabel="Save task"
      />
    </div>
  );
}
