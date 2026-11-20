import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { createTask } from "@/lib/content-actions";
import { TaskEditorForm } from "@/components/TaskEditorForm";
import { requireStaff } from "@/lib/access";
import { designerUrl } from "@/lib/papers";

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ versionId?: string; candidateId?: string; trackCode?: string; paperId?: string }>;
}) {
  await requireStaff("editAssessment");
  const { versionId, candidateId, trackCode, paperId } = await searchParams;
  if (!versionId) notFound();
  const version = await prisma.assessmentVersion.findUnique({
    where: { id: versionId },
  });
  if (!version || (version.status !== "DRAFT" && version.status !== "PRIVATE")) {
    notFound();
  }

  return (
    <div className="max-w-2xl">
      <Link href={designerUrl(trackCode, paperId || version.assessmentId)} className="text-sm text-staff-accent">
        Back to paper
      </Link>
      <p className="mt-4 text-xs uppercase tracking-[0.2em] text-staff-muted">Question paper</p>
      <h1 className="mt-2 font-serif text-4xl text-staff-strong">Add a question</h1>
      <p className="mt-3 mb-8 text-sm leading-6 text-staff-body">
        This is added only to this version. Other papers stay as they are until you
        publish. For one candidate, invite them with this paper’s title, then customize
        on their record if needed.
      </p>
      <TaskEditorForm
        action={createTask}
        versionId={version.id}
        candidateId={candidateId}
        trackCode={trackCode}
        paperId={paperId || version.assessmentId}
        submitLabel="Add question"
      />
    </div>
  );
}
