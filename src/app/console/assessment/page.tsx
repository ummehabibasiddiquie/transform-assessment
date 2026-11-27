import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/access";
import { RolePaperSelect } from "@/components/RolePaperSelect";
import { SubmitButton } from "@/components/SubmitButton";
import {
  createCustomBlankPaper,
  createRolePaper,
  deleteTask,
  publishDraft,
  saveVersionCopy,
  startTemplateDraft,
} from "@/lib/content-actions";
import { customPapers, papersForTrack, publishedPapersForDesigner } from "@/lib/papers";
import { MAX_TEST_DURATION_MIN } from "@/lib/invite-email";
import type { Assessment, AssessmentVersion, Task } from "@prisma/client";

type Paper = Assessment & { versions: (AssessmentVersion & { tasks: Task[] })[] };

const inputClass =
  "w-full rounded-md border border-staff-line bg-staff-bg px-3 py-2.5 text-staff-strong outline-none focus:border-staff-accent";

function versionLine(paper: Paper, trackCode?: string, selectedVersionId?: string) {
  return paper.versions
    .filter((item) => item.status !== "PRIVATE")
    .slice()
    .sort((a, b) => b.version - a.version)
    .map((item) => {
      const href = `/console/assessment?${new URLSearchParams({
        ...(trackCode ? { role: trackCode } : {}),
        paper: paper.id,
        version: item.id,
      }).toString()}`;
      const current = selectedVersionId === item.id;
      return (
        <li key={item.id}>
          <Link href={href} className={current ? "font-medium text-staff-accent" : "text-staff-strong"}>
            {paper.name}
          </Link>
          <span className="text-staff-muted">
            {" "}
            · {item.status.toLowerCase()} v{item.version}
            {item.status === "ARCHIVED" ? " (previous)" : ""}
          </span>
        </li>
      );
    });
}

function PaperEditor({
  paper,
  trackCode,
  versionId,
}: {
  paper: Paper;
  trackCode?: string;
  versionId?: string;
}) {
  const requested = versionId ? paper.versions.find((item) => item.id === versionId) : null;
  const draft = paper.versions.find((item) => item.status === "DRAFT");
  const published = paper.versions.find((item) => item.status === "PUBLISHED");
  const working = requested ?? draft ?? published ?? paper.versions[0];
  if (!working) return null;
  const canEdit = working.status === "DRAFT" || working.status === "PRIVATE";
  const addHref = `/console/assessment/tasks/new?versionId=${working.id}&paperId=${paper.id}${
    trackCode ? `&trackCode=${encodeURIComponent(trackCode)}` : ""
  }`;

  return (
    <section className="space-y-6">
      <form action={saveVersionCopy} className="rounded-lg border border-staff-line p-5 space-y-4">
        <input type="hidden" name="versionId" value={working.id} />
        {trackCode ? <input type="hidden" name="trackCode" value={trackCode} /> : null}
        <input type="hidden" name="paperId" value={paper.id} />
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">Paper title</span>
          <input name="title" required defaultValue={paper.name} disabled={!canEdit} className={inputClass} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">
            Instructions for the candidate
          </span>
          <textarea
            name="instructions"
            rows={4}
            defaultValue={working.instructions}
            disabled={!canEdit}
            className={inputClass}
          />
        </label>
        <label className="block max-w-xs space-y-1.5">
          <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">Duration (minutes)</span>
          <input
            name="durationMin"
            type="number"
            min={10}
            max={MAX_TEST_DURATION_MIN}
            defaultValue={paper.durationMin}
            disabled={!canEdit}
            className={inputClass}
          />
        </label>
        {canEdit ? (
          <SubmitButton
            pendingText="Saving…"
            className="rounded-md bg-staff-accent px-4 py-2.5 text-sm font-medium text-staff-bg"
          >
            Save title and details
          </SubmitButton>
        ) : (
          <p className="text-sm text-staff-muted">
            This version is published. Start a new version to change the title or questions.
          </p>
        )}
      </form>

      <div className="flex flex-wrap gap-3">
        {working.status === "PUBLISHED" && !draft ? (
          <form action={startTemplateDraft}>
            <input type="hidden" name="assessmentId" value={paper.id} />
            {trackCode ? <input type="hidden" name="trackCode" value={trackCode} /> : null}
            <SubmitButton
              pendingText="Copying…"
              className="rounded-md bg-staff-accent px-4 py-2.5 text-sm font-medium text-staff-bg"
            >
              Start a new version
            </SubmitButton>
          </form>
        ) : null}
        {working.status === "DRAFT" ? (
          <form action={publishDraft}>
            <input type="hidden" name="versionId" value={working.id} />
            {trackCode ? <input type="hidden" name="trackCode" value={trackCode} /> : null}
            <input type="hidden" name="paperId" value={paper.id} />
            <SubmitButton
              pendingText="Publishing…"
              className="rounded-md bg-staff-accent px-4 py-2.5 text-sm font-medium text-staff-bg"
            >
              Publish this version
            </SubmitButton>
          </form>
        ) : null}
        {canEdit ? (
          <Link href={addHref} className="rounded-md border border-staff-line px-4 py-2.5 text-sm text-staff-strong">
            Add a question
          </Link>
        ) : null}
      </div>

      <p className="text-sm text-staff-muted">
        Version {working.version} · {working.status.toLowerCase()} · {working.tasks.length} questions.
        After publish, choose this title when inviting a candidate.
      </p>

      {working.tasks.length === 0 ? (
        <p className="rounded-lg border border-staff-line p-5 text-sm text-staff-body">
          This paper is empty. Add questions here, then publish. That is what a blank paper is for.
        </p>
      ) : (
        working.tasks
          .slice()
          .sort((a, b) => a.sequence - b.sequence)
          .map((task) => (
            <article key={task.id} className="rounded-lg border border-staff-line p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-staff-muted">
                Task {task.sequence} · {task.responseType}
                {task.timeLimitMin ? ` · ${task.timeLimitMin} min` : ""}
              </p>
              <h3 className="mt-1 font-serif text-xl text-staff-strong">{task.title}</h3>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-staff-body">{task.instructions}</p>
              {canEdit ? (
                <div className="mt-4 flex gap-3">
                  <Link
                    className="text-sm text-staff-accent"
                    href={`/console/assessment/tasks/${task.id}?paperId=${paper.id}${
                      trackCode ? `&trackCode=${encodeURIComponent(trackCode)}` : ""
                    }`}
                  >
                    Edit
                  </Link>
                  <form action={deleteTask}>
                    <input type="hidden" name="taskId" value={task.id} />
                    {trackCode ? <input type="hidden" name="trackCode" value={trackCode} /> : null}
                    <input type="hidden" name="paperId" value={paper.id} />
                    <button className="text-sm text-staff-muted">Remove</button>
                  </form>
                </div>
              ) : null}
            </article>
          ))
      )}
    </section>
  );
}

export default async function AssessmentContentPage({
  searchParams,
}: {
  searchParams: Promise<{
    role?: string;
    paper?: string;
    version?: string;
    go?: string;
    error?: string;
    saved?: string;
  }>;
}) {
  await requireStaff("editAssessment");
  const query = await searchParams;
  const { error, saved } = query;
  let roleCode = query.role;
  let paperId = query.paper;
  let versionId = query.version;
  if (query.go?.startsWith("role:")) {
    roleCode = query.go.slice(5);
    paperId = undefined;
    versionId = undefined;
  } else if (query.go?.startsWith("paper:")) {
    const parts = query.go.split(":");
    paperId = parts[1];
    versionId = parts[2];
    roleCode = undefined;
  }
  const tracks = await prisma.assessmentTrack.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ roleName: "asc" }, { level: "asc" }],
  });
  const publishedNav = await publishedPapersForDesigner(prisma, tracks);
  if (paperId && !roleCode) {
    const nav = publishedNav.find((item) => item.paperId === paperId);
    roleCode = nav?.trackCode;
  }
  const track = roleCode ? tracks.find((item) => item.code === roleCode) : null;
  const rolePapers = track ? await papersForTrack(prisma, track.code) : [];
  const blankPapers = track ? [] : await customPapers(prisma);
  const papers = track ? rolePapers : blankPapers;
  const selected = paperId
    ? papers.find((item) => item.id === paperId) ??
      (await prisma.assessment.findUnique({
        where: { id: paperId },
        include: { versions: { include: { tasks: true }, orderBy: { version: "desc" } } },
      }))
    : null;
  const notice =
    saved === "published"
      ? "Published. This title now appears in the invite paper list."
      : saved === "created"
        ? "Paper created. Add or edit questions, then publish so you can invite with this title."
        : saved === "draft"
          ? "New version started. The previous published paper is unchanged until you publish."
          : saved === "saved"
            ? "Paper details saved."
            : saved
              ? "Saved."
              : null;
  const currentGo = versionId && paperId
    ? `paper:${paperId}:${versionId}`
    : paperId
      ? publishedNav.find((item) => item.paperId === paperId)?.go ?? (track ? `role:${track.code}` : "")
      : track
        ? `role:${track.code}`
        : "";

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-staff-muted">Question papers</p>
        <h1 className="mt-2 font-serif text-4xl text-staff-strong">Assessment designer</h1>
        <p className="mt-3 text-sm leading-6 text-staff-body">
          Two ways to start: pick a role to work from that role’s questions, or stay here and
          create a blank paper you fill yourself. Publish, then choose the paper by title when
          you invite someone.
        </p>
      </div>

      {error ? <p className="text-sm text-staff-accent">{error}</p> : null}
      {notice ? <p className="text-sm text-staff-body">{notice}</p> : null}

      <RolePaperSelect
        current={currentGo}
        tracks={tracks.map((item) => ({
          code: item.code,
          label: `${item.roleName} — ${item.level}`,
        }))}
        papers={publishedNav}
      />

      {!track && !selected ? (
        <section className="rounded-lg border border-staff-line p-5 space-y-4">
          <h2 className="font-serif text-2xl text-staff-strong">Create a blank paper</h2>
          <p className="text-sm leading-6 text-staff-body">
            Give it a title, then you will add questions on the next screen. Publish when it
            is ready, and pick that title when you invite someone.
          </p>
          {blankPapers.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.16em] text-staff-muted">Open an existing blank paper</p>
              <ul className="space-y-2 text-sm">
                {blankPapers.flatMap((paper) => versionLine(paper, undefined, versionId))}
              </ul>
            </div>
          ) : null}
          <form action={createCustomBlankPaper} className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">Paper title</span>
              <input name="title" required placeholder="For example: Walk-in interview paper" className={inputClass} />
            </label>
            <SubmitButton
              pendingText="Creating…"
              className="rounded-md bg-staff-accent px-4 py-2.5 text-sm font-medium text-staff-bg"
            >
              Create blank paper
            </SubmitButton>
          </form>
        </section>
      ) : null}

      {track && !selected ? (
        <section className="rounded-lg border border-staff-line p-5 space-y-4">
          <h2 className="font-serif text-2xl text-staff-strong">
            Papers for {track.roleName} — {track.level}
          </h2>
          <p className="text-sm leading-6 text-staff-body">
            Name a paper and create it from this role’s questions. You then edit and publish
            that version.
          </p>
          {rolePapers.length === 0 ? (
            <p className="text-sm text-staff-body">No staff paper yet for this role.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {rolePapers.flatMap((paper) => versionLine(paper, track.code, versionId))}
            </ul>
          )}
          <form action={createRolePaper} className="space-y-3">
            <input type="hidden" name="trackCode" value={track.code} />
            <label className="block space-y-1.5">
              <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">New paper title</span>
              <input
                name="title"
                required
                placeholder={`${track.roleName} — ${track.level}`}
                className={inputClass}
              />
            </label>
            <SubmitButton
              pendingText="Creating…"
              className="rounded-md bg-staff-accent px-4 py-2.5 text-sm font-medium text-staff-bg"
            >
              Create from this role’s questions
            </SubmitButton>
          </form>
        </section>
      ) : null}

      {selected ? (
        <div className="space-y-4">
          <PaperEditor paper={selected} trackCode={track?.code} versionId={versionId} />
          {!track ? (
            <Link href="/console/assessment" className="inline-flex text-sm text-staff-accent">
              Create another blank paper
            </Link>
          ) : (
            <Link
              href={`/console/assessment?role=${encodeURIComponent(track.code)}`}
              className="inline-flex text-sm text-staff-accent"
            >
              Create another paper for this role
            </Link>
          )}
        </div>
      ) : null}
    </div>
  );
}
