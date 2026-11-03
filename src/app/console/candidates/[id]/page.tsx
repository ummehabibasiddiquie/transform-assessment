import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { recommendationLabel } from "@/lib/scoring";
import {
  gateResults,
  isAutoMarked,
  MARK_OPTIONS,
  scoreModules,
  testTotals,
} from "@/lib/module-score";
import { CollapsibleList } from "@/components/CollapsibleList";
import { ResponseView } from "@/components/ResponseView";
import { CopyLink } from "@/components/CopyLink";
import { SubmittedWorkPanel } from "@/components/SubmittedWorkPanel";
import {
  recordDecision,
  resendInviteEmail,
  runAutoEvaluation,
  saveEvaluation,
  saveTaskMarks,
  saveInterview,
  saveUncertainties,
} from "@/lib/actions";
import { gateRules, INTERVIEW_GATE_STATUSES } from "@/lib/gates";
import { bandFor, bandsForRole } from "@/lib/bands";
import { readEvidenceKeys } from "@/lib/competency-evidence";
import { CompetencyEvidence } from "@/components/CompetencyEvidence";
import { SubmitButton } from "@/components/SubmitButton";
import { appUrl } from "@/lib/env";
import { requireStaff } from "@/lib/access";
import { can } from "@/lib/permissions";
import { defaultCompleteByInput, HR_CONTACT_EMAIL } from "@/lib/invite-email";

export const maxDuration = 60;

function formatMarks(points: number) {
  return Number.isInteger(points) ? String(points) : points.toFixed(1);
}

const PAPER_PARTS = [
  { module: "COMMON_APTITUDE", label: "Aptitude and reasoning" },
  { module: "COMMON_PROBLEM_SOLVING", label: "Problem solving" },
  { module: "ROLE", label: "Role tasks" },
];

const INTERVIEW_PROBES = [
  "A requirement changes halfway through a task and some previous work may now be wrong. What do you do in the first 10 minutes?",
  "You are behind target but quality has started falling. How do you decide what to do?",
  "Tell me how you would handle a problem where you do not know the answer and your first attempt fails.",
  "You used AI and received a confident answer that looked wrong. How would you verify it?",
  "If you joined a project tomorrow and knew nothing about the work, what would you do first?",
];

export default async function CandidateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ auto?: string; mail?: string }>;
}) {
  const { id } = await params;
  const { auto = "", mail = "" } = await searchParams;
  const staff = await requireStaff("viewCandidates");
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: {
      invites: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          assessmentVersion: {
            include: {
              assessment: { select: { name: true } },
              tasks: {
                orderBy: { sequence: "asc" },
                select: { id: true, sequence: true, module: true, title: true },
              },
            },
          },
        },
      },
      decisions: { include: { decidedBy: true }, orderBy: { createdAt: "desc" } },
      attempts: {
        orderBy: { startedAt: "desc" },
        take: 1,
        include: {
          interview: true,
          evaluations: true,
          responses: { include: { task: { include: { key: true } } } },
          suggestions: true,
          gateReviews: true,
          taskMarks: true,
          assessmentVersion: {
            include: {
              tasks: { orderBy: { sequence: "asc" }, include: { key: true } },
              assessment: {
                include: {
                  roleVersion: {
                    include: { competencies: { orderBy: { sortOrder: "asc" } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!candidate) notFound();

  const baseUrl = appUrl(await headers());
  const invite = candidate.invites[0];
  const inviteUrl = invite ? `${baseUrl}/a/${invite.token}` : "";
  const attempt = candidate.attempts[0];
  if (staff.role === "EVALUATOR" && attempt?.status !== "SUBMITTED") {
    return (
      <div className="space-y-4">
        <Link href="/console/candidates" className="text-sm text-staff-accent">
          Submitted tests
        </Link>
        <h1 className="mt-4 font-serif text-4xl text-staff-strong">{candidate.name}</h1>
        <p className="text-sm leading-6 text-staff-body">
          This person has not submitted a test yet.
        </p>
      </div>
    );
  }
  const competencies =
    attempt?.assessmentVersion.assessment.roleVersion.competencies ?? [];
  const canScore = can(staff.role, "score");
  const gates = attempt
    ? await gateRules(
      prisma,
      attempt.assessmentVersion.criticalGates,
      attempt.assessmentVersion.assessment.name,
    )
    : [];
  const failedGates = gates.filter((gate) =>
    attempt?.gateReviews.some((review) => review.gate === gate.name && review.status === "FAIL"),
  );
  const gateTasks = attempt ? gateResults(attempt.assessmentVersion.tasks, attempt.responses) : [];
  const roleBands = attempt
    ? await bandsForRole(prisma, attempt.assessmentVersion.assessment.name)
    : null;
  const totals = attempt
    ? testTotals(attempt.assessmentVersion.tasks, attempt.responses, attempt.taskMarks)
    : null;
  const systemBand =
    totals?.complete && totals.percent != null && roleBands
      ? bandFor(totals.percent, roleBands.bands)
      : null;
  const writtenTasks = attempt
    ? attempt.assessmentVersion.tasks.filter((task) => !isAutoMarked(task))
    : [];
  const evidenceKeys = readEvidenceKeys(
    await prisma.libraryConfig.findMany({ where: { kind: "EVIDENCE_KEY" } }),
  );
  const lowScores = attempt?.evaluations.filter((item) => item.score <= 3) ?? [];
  const focusProbes =
    lowScores.length > 0 ? INTERVIEW_PROBES.slice(0, 3) : INTERVIEW_PROBES.slice(0, 2);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/console/candidates" className="text-sm text-staff-accent">
          All candidates
        </Link>
        <p className="mt-4 text-xs uppercase tracking-[0.2em] text-staff-muted">
          Candidate
        </p>
        <h1 className="mt-2 font-serif text-4xl text-staff-strong">{candidate.name}</h1>
        {invite?.assessmentVersion ? (
          <p className="mt-2 text-base text-staff-accent">
            Role applied for: {invite.assessmentVersion.assessment.name}
          </p>
        ) : null}
        <p className="mt-2 text-sm text-staff-body">
          {candidate.email} · {candidate.status.replace("_", " ")}
          {invite?.assessmentVersion
            ? ` · paper v${invite.assessmentVersion.version}`
            : ""}
        </p>
        {can(staff.role, "editAssessment") ? (
          <Link
            href={`/console/candidates/${candidate.id}/tasks`}
            className="mt-4 inline-flex text-sm text-staff-accent"
          >
            View or customize this person’s tasks
          </Link>
        ) : null}
      </div>

      {inviteUrl && can(staff.role, "invite") ? (
        <section className="rounded-lg border border-staff-line p-5">
          <h2 className="font-serif text-xl text-staff-strong">Test invitation</h2>
          <p className="mt-2 mb-4 text-sm text-staff-muted">
            The candidate is emailed this private link. It does not show scores
            or competencies. Contact on the email is {HR_CONTACT_EMAIL}; they
            are asked not to reply to the sending address.
          </p>
          {mail === "sent" ? (
            <p className="mb-4 text-sm text-staff-body">Invitation email sent to {candidate.email}.</p>
          ) : null}
          <CopyLink url={inviteUrl} />
          <form action={resendInviteEmail} className="mt-4 flex flex-wrap items-end gap-3">
            <input type="hidden" name="candidateId" value={candidate.id} />
            <label className="block space-y-1.5">
              <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">
                Complete by (India time)
              </span>
              <input
                name="completeBy"
                type="datetime-local"
                required
                defaultValue={defaultCompleteByInput()}
                className="rounded-md border border-staff-line bg-staff-bg px-3 py-2 text-staff-strong outline-none focus:border-staff-accent"
              />
            </label>
            <SubmitButton
              pendingText="Sending…"
              className="rounded-md bg-staff-accent px-4 py-2 text-sm font-medium text-staff-bg"
            >
              Send invitation email
            </SubmitButton>
          </form>
        </section>
      ) : null}

      {invite?.assessmentVersion.tasks.length ? (
        <CollapsibleList
          title="Paper on this link"
          summary={`${invite.assessmentVersion.tasks.length} tasks · closed by default · open only if you need the full list`}
        >
          <p className="mb-4 text-sm leading-6 text-staff-muted">
            This copy stays as it was when the link was created. A later library import does not change it.
          </p>
          <div className="space-y-4">
            {PAPER_PARTS.map((part) => {
              const tasks = invite.assessmentVersion.tasks.filter((task) => task.module === part.module);
              if (tasks.length === 0) return null;
              return (
                <div key={part.module}>
                  <p className="text-xs uppercase tracking-[0.16em] text-staff-muted">
                    {part.label} · {tasks.length}
                  </p>
                  <ol className="mt-2 space-y-1 text-sm text-staff-text">
                    {tasks.map((task) => (
                      <li key={task.id}>
                        {task.sequence}. {task.title}
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        </CollapsibleList>
      ) : null}

      {attempt ? (
        <section className="grid gap-3 sm:grid-cols-3">
          {Object.values(
            scoreModules(attempt.assessmentVersion.tasks, attempt.responses, attempt.taskMarks),
          ).map((score) => (
            <div key={score.label} className="rounded-lg border border-staff-line p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-staff-muted">{score.label}</p>
              <p className="mt-1 font-serif text-3xl text-staff-strong">
                {formatMarks(score.points)} / {score.total}
              </p>
              {score.scored > 0 ? (
                <p className="mt-1 text-sm text-staff-strong">
                  Multiple choice: {score.correct} / {score.scored} correct
                </p>
              ) : null}
              {score.manual > 0 ? (
                <p
                  className={`mt-1 text-sm ${score.marked < score.manual ? "text-staff-accent" : "text-staff-strong"}`}
                >
                  Written: {score.marked} of {score.manual} marked
                </p>
              ) : null}
              <p className="mt-1 text-xs text-staff-muted">
                Answered {score.answered} of {score.total} questions
              </p>
            </div>
          ))}
        </section>
      ) : null}

      {failedGates.length > 0 ? (
        <div className="rounded-md border border-staff-accent p-4 text-sm text-staff-text">
          <p className="font-medium text-staff-accent">
            Critical gate failed: {failedGates.map((gate) => gate.name).join(", ")}
          </p>
          {failedGates.map((gate) =>
            gate.effect ? (
              <p key={gate.name} className="mt-1 text-xs">
                {gate.name}: workbook guidance is “{gate.effect}”.
              </p>
            ) : null,
          )}
        </div>
      ) : null}

      {attempt && attempt.status === "SUBMITTED" && totals ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-staff-line p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-staff-muted">
              Overall test score
            </p>
            <p className="mt-1 font-serif text-3xl text-staff-strong">
              {formatMarks(totals.points)} / {totals.total}
            </p>
            <p className="mt-1 text-sm text-staff-strong">
              {totals.percent == null ? "—" : `${totals.percent}%`}
            </p>
            {totals.complete ? (
              <p className="mt-1 text-xs text-staff-muted">All answers marked.</p>
            ) : (
              <p className="mt-1 text-xs text-staff-accent">
                Not final: {totals.toMark} written {totals.toMark === 1 ? "answer" : "answers"} still
                to mark below.
              </p>
            )}
          </div>
          <div className="rounded-lg border border-staff-line p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-staff-muted">System view</p>
            <p className="mt-1 font-serif text-2xl text-staff-strong">
              {systemBand ? recommendationLabel(systemBand.recommendation) : "Waiting for marking"}
            </p>
            {systemBand?.definition ? (
              <p className="mt-1 text-xs text-staff-body">{systemBand.definition}</p>
            ) : null}
            {roleBands?.general ? (
              <p className="mt-1 text-xs text-staff-muted">
                General guide. The workbook gives score bands only for{" "}
                {roleBands.scope || "one role"}.
              </p>
            ) : null}
            {failedGates.length > 0 ? (
              <p className="mt-1 text-xs text-staff-accent">
                A critical gate failed. The workbook says this can override the score.
              </p>
            ) : null}
          </div>
          <div className="rounded-lg border border-staff-line p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-staff-muted">
              Competency rating
            </p>
            <p className="mt-1 font-serif text-3xl text-staff-strong">
              {attempt.overallScore == null ? "—" : `${attempt.overallScore} / 100`}
            </p>
            <p className="mt-1 text-xs text-staff-muted">
              {attempt.overallScore == null
                ? "From the 1–5 competency scores, once saved."
                : "From the 1–5 competency scores. Not part of the test score."}
            </p>
          </div>
          <div className="rounded-lg border border-staff-line p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-staff-muted">Human decision</p>
            <p className="mt-1 font-serif text-2xl text-staff-strong">
              {candidate.decisions[0]
                ? recommendationLabel(candidate.decisions[0].outcome)
                : "Pending"}
            </p>
          </div>
        </section>
      ) : null}

      {attempt ? (
        <SubmittedWorkPanel
          tasks={attempt.assessmentVersion.tasks.map((task) => {
            const response = attempt.responses.find((item) => item.taskId === task.id);
            return {
              id: task.id,
              sequence: task.sequence,
              module: task.module,
              family: task.family,
              title: task.title,
              instructions: task.instructions,
              answerKey: task.key?.answerKey ?? "",
              contentJson: response?.contentJson ?? null,
              resourceLogJson: response?.resourceLogJson ?? null,
            };
          })}
        />
      ) : (
        <p className="text-sm text-staff-muted">The candidate has not started yet.</p>
      )}

      {attempt && attempt.status === "SUBMITTED" && canScore ? (
        <section className="rounded-lg border border-staff-line p-5">
          <h2 className="font-serif text-2xl text-staff-strong">Claude draft</h2>
          <p className="mt-2 text-sm text-staff-muted">
            Claude suggests a mark for each written answer and a 1–5 score for each competency.
            Nothing counts until you check the suggestions and save them below.
          </p>
          <form action={runAutoEvaluation} className="mt-4">
            <input type="hidden" name="attemptId" value={attempt.id} />
            <input type="hidden" name="candidateId" value={candidate.id} />
            <SubmitButton
              pendingText="Claude is reading the answers…"
              className="rounded-md border border-staff-accent px-4 py-2 text-sm text-staff-strong"
            >
              Score with Claude
            </SubmitButton>
          </form>
          {auto === "ok" ? (
            <p className="mt-3 text-sm text-staff-body">
              Claude filled the marks and competency scores below. Change anything that looks
              wrong, then save each section. It does not record Hire or No Hire.
            </p>
          ) : auto ? (
            <p className="mt-3 text-sm text-staff-accent">{auto}</p>
          ) : null}
        </section>
      ) : null}

      {attempt && attempt.status === "SUBMITTED" && canScore && writtenTasks.length > 0 ? (
        <section className="rounded-lg border border-staff-line p-5">
          <h2 className="font-serif text-2xl text-staff-strong">Mark written answers</h2>
          <p className="mt-2 text-sm text-staff-muted">
            Multiple-choice answers are marked automatically. Mark each written answer against
            its key: Correct is 1 mark, Partly is ½, Wrong is 0. These marks make up the overall
            test score.
          </p>
          <form action={saveTaskMarks} className="mt-4 space-y-3">
            <input type="hidden" name="attemptId" value={attempt.id} />
            <input type="hidden" name="candidateId" value={candidate.id} />
            {writtenTasks.map((task) => {
              const saved = attempt.taskMarks.find((item) => item.taskId === task.id);
              const response = attempt.responses.find((item) => item.taskId === task.id);
              const current = saved?.mark ?? saved?.aiMark ?? null;
              const fromClaude = saved?.mark == null && saved?.aiMark != null;
              return (
                <div key={task.id} className="rounded-md border border-staff-line p-3">
                  <input type="hidden" name="taskId" value={task.id} />
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <p className="text-sm text-staff-strong">
                      <span className="text-xs uppercase tracking-[0.14em] text-staff-muted">
                        Task {task.sequence}
                      </span>{" "}
                      {task.title}
                    </p>
                    <div className="flex gap-4 text-sm">
                      {MARK_OPTIONS.map((option) => (
                        <label key={option.value} className="flex items-center gap-1.5">
                          <input
                            type="radio"
                            name={`mark-${task.id}`}
                            value={String(option.value)}
                            defaultChecked={current === option.value}
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-staff-muted">
                    {saved?.mark != null
                      ? "Marked"
                      : fromClaude
                        ? "Claude suggestion — not saved yet"
                        : "Not marked yet"}
                    {saved?.aiReason ? ` · Claude: ${saved.aiReason}` : ""}
                  </p>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-staff-accent">
                      Show question, answer and key
                    </summary>
                    <div className="mt-3 space-y-3 rounded-md border border-staff-line/60 bg-staff-bg/40 p-3 text-sm">
                      {task.instructions ? (
                        <div>
                          <p className="text-xs uppercase tracking-[0.14em] text-staff-muted font-medium">
                            Question
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-staff-body">
                            {task.instructions}
                          </p>
                        </div>
                      ) : null}
                      {task.referenceMaterial ? (
                        <div>
                          <p className="text-xs uppercase tracking-[0.14em] text-staff-muted font-medium">
                            Reference Material
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-xs text-staff-muted">
                            {task.referenceMaterial}
                          </p>
                        </div>
                      ) : null}
                      {task.key?.answerKey ? (
                        <div className="rounded border border-staff-accent/30 bg-staff-accent/5 p-2.5">
                          <p className="text-xs uppercase tracking-[0.14em] text-staff-accent font-medium">
                            Answer Key (Evaluation Guide)
                          </p>
                          <p className="mt-1 text-sm text-staff-accent">{task.key.answerKey}</p>
                          {task.key.rubric ? (
                            <p className="mt-1 text-xs text-staff-muted">{task.key.rubric}</p>
                          ) : null}
                        </div>
                      ) : null}
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-staff-muted font-medium">
                          Candidate Answer
                        </p>
                        <div className="mt-2">
                          {response ? (
                            <ResponseView
                              family={task.family}
                              contentJson={response.contentJson}
                              resourceLogJson={response.resourceLogJson}
                            />
                          ) : (
                            <p className="text-staff-muted italic">No response saved.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </details>
                </div>
              );
            })}
            <SubmitButton
              pendingText="Saving marks…"
              className="rounded-md bg-staff-accent px-4 py-2.5 text-sm font-medium text-staff-bg"
            >
              Save marks
            </SubmitButton>
          </form>
        </section>
      ) : null}

      {attempt && attempt.status === "SUBMITTED" && canScore ? (
        <section className="rounded-lg border border-staff-line p-5">
          <h2 className="font-serif text-2xl text-staff-strong">Score competencies</h2>
          <p className="mt-2 text-sm text-staff-muted">
            5 is exceptional, 3 is acceptable, 1 is poor. This gives the competency rating. It is
            separate from the test score.
          </p>
          <form action={saveEvaluation} className="mt-6 space-y-6">
            <input type="hidden" name="attemptId" value={attempt.id} />
            <input type="hidden" name="candidateId" value={candidate.id} />
            {competencies.map((competency) => {
              const existing = attempt.evaluations.find(
                (item) => item.competencyId === competency.id,
              );
              const suggestion = attempt.suggestions.find(
                (item) => item.competencyId === competency.id,
              );
              const draftScore = existing?.score ?? suggestion?.score;
              const draftRationale = existing?.rationale || suggestion?.rationale || "";
              const fromClaude = !existing && Boolean(suggestion);
              return (
                <div key={competency.id} className="border-b border-staff-line pb-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-staff-strong">{competency.name}</h3>
                    <p className="text-xs text-staff-muted">
                      Weight {competency.weight}%
                      {fromClaude ? " · Claude draft" : ""}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-staff-body">{competency.definition}</p>
                  <p className="mt-2 text-xs text-staff-muted">
                    5: {competency.exceptional} · 3: {competency.acceptable} · 1: {competency.poor}
                  </p>
                  <CompetencyEvidence
                    competencyName={competency.name}
                    evidenceKeys={evidenceKeys}
                    tasks={attempt.assessmentVersion.tasks}
                    responses={attempt.responses}
                  />
                  <div className="mt-3 flex gap-3">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <label key={score} className="flex items-center gap-1 text-sm">
                        <input
                          type="radio"
                          name={`score-${competency.id}`}
                          value={score}
                          defaultChecked={draftScore === score}
                          required
                        />
                        {score}
                      </label>
                    ))}
                  </div>
                  <textarea
                    name={`rationale-${competency.id}`}
                    defaultValue={draftRationale}
                    placeholder="Evidence for this score"
                    className="mt-3 w-full rounded-md border border-staff-line bg-staff-bg px-3 py-2 text-sm text-staff-text"
                    rows={3}
                  />
                </div>
              );
            })}
            <button className="rounded-md bg-staff-accent px-4 py-2.5 text-sm font-medium text-staff-bg">
              Save scores
            </button>
          </form>
        </section>
      ) : null}

      {attempt && attempt.status === "SUBMITTED" && can(staff.role, "score") ? (
        <section className="rounded-lg border border-staff-line p-5">
          <h2 className="font-serif text-2xl text-staff-strong">What is still unclear</h2>
          <p className="mt-2 text-sm text-staff-muted">
            Note anything the test could not settle, so the interviewer can check it.
          </p>
          <form action={saveUncertainties} className="mt-4 space-y-3">
            <input type="hidden" name="attemptId" value={attempt.id} />
            <input type="hidden" name="candidateId" value={candidate.id} />
            <textarea
              name="uncertainties"
              defaultValue={attempt.uncertainties}
              placeholder="For example: not sure the candidate understood task 6 — check in the interview."
              rows={4}
              className="w-full rounded-md border border-staff-line bg-staff-bg px-3 py-2 text-sm text-staff-text"
            />
            <button className="rounded-md border border-staff-accent px-4 py-2 text-sm text-staff-accent">
              Save notes
            </button>
          </form>
        </section>
      ) : null}

      {attempt?.status === "SUBMITTED" &&
        (can(staff.role, "interview") || can(staff.role, "decide")) ? (
        <section className="space-y-6">
          {can(staff.role, "interview") ? (
            <div className="rounded-lg border border-staff-line p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-serif text-2xl text-staff-strong">Interview evaluation</h2>
                <p className="text-xs text-staff-muted">
                  Check critical gates and record interview observations in one place.
                </p>
              </div>

              {attempt.uncertainties ? (
                <div className="mt-4 rounded-md border border-staff-line bg-staff-bg/50 p-4 text-sm">
                  <p className="text-xs uppercase tracking-[0.14em] text-staff-muted font-medium">
                    Still unclear from the written test
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-staff-text">{attempt.uncertainties}</p>
                </div>
              ) : null}

              <form action={saveInterview} className="mt-6 space-y-6">
                <input type="hidden" name="attemptId" value={attempt.id} />
                <input type="hidden" name="candidateId" value={candidate.id} />
                <input type="hidden" name="gateCount" value={gates.length} />

                {/* Critical Gates */}
                {gates.length > 0 ? (
                  <div className="rounded-md border border-staff-line/60 bg-staff-bg/30 p-4 space-y-4">
                    <div>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="text-base font-medium text-staff-strong">
                          Critical gates check
                        </h3>
                        <span className="text-xs uppercase tracking-[0.14em] text-staff-muted">
                          {gates.length} {gates.length === 1 ? "gate" : "gates"} to verify
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-staff-muted">
                        Evaluate core behaviors (integrity, safety, verification, ownership). A failed gate flags a critical warning for the hiring decision.
                      </p>
                      {gateTasks.length > 0 ? (
                        <p className="mt-2 text-xs text-staff-muted">
                          <span className="font-medium text-staff-body">Relevant test tasks:</span>{" "}
                          {gateTasks.map((task) => `${task.title} (${task.status})`).join(" · ")}
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-4 pt-1">
                      {gates.map((gate, index) => {
                        const review = attempt.gateReviews.find((item) => item.gate === gate.name);
                        return (
                          <div key={gate.name} className="border-b border-staff-line/60 pb-4 last:border-b-0 last:pb-0">
                            <input type="hidden" name={`gate-name-${index}`} value={gate.name} />
                            <div className="flex flex-wrap items-baseline justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-staff-strong">{gate.name}</h4>
                                {review?.status ? (
                                  <span
                                    className={`rounded px-2 py-0.5 text-xs font-medium ${review.status === "PASS"
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                      : review.status === "FAIL"
                                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                      }`}
                                  >
                                    {review.status}
                                  </span>
                                ) : (
                                  <span className="text-xs text-staff-muted">Not marked</span>
                                )}
                              </div>
                              <div className="flex gap-4 text-sm">
                                {INTERVIEW_GATE_STATUSES.map((status) => (
                                  <label key={status.value} className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`gate-status-${index}`}
                                      value={status.value}
                                      defaultChecked={review?.status === status.value}
                                    />
                                    {status.label}
                                  </label>
                                ))}
                              </div>
                            </div>
                            {gate.trigger ? (
                              <p className="mt-1 text-xs text-staff-muted">
                                Fails when: {gate.trigger}
                                {gate.effect ? ` · Guidance: ${gate.effect}` : ""}
                              </p>
                            ) : null}
                            <input
                              name={`gate-note-${index}`}
                              defaultValue={review?.note}
                              placeholder="What the interview showed / notes on this gate"
                              className="mt-2 w-full rounded-md border border-staff-line bg-staff-bg px-3 py-1.5 text-sm text-staff-text"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {/* Interview Notes & Probes */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-medium text-staff-strong">
                      Interview discussion & notes
                    </h3>
                    <p className="mt-1 text-xs text-staff-muted">
                      Recommended probes to check remaining uncertainty:
                    </p>
                    <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-staff-body">
                      {focusProbes.map((probe) => (
                        <li key={probe}>{probe}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <label className="text-xs uppercase tracking-[0.14em] text-staff-muted font-medium">
                      Probes used
                    </label>
                    <textarea
                      name="probesUsed"
                      defaultValue={attempt.interview?.probesUsed}
                      placeholder="Which probes you actually used in the conversation"
                      rows={2}
                      className="mt-1 w-full rounded-md border border-staff-line bg-staff-bg px-3 py-2 text-sm text-staff-text"
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase tracking-[0.14em] text-staff-muted font-medium">
                      Interview notes & observations
                    </label>
                    <textarea
                      name="notes"
                      defaultValue={attempt.interview?.notes}
                      placeholder="Overall interview notes, candidate depth, and observations"
                      rows={5}
                      className="mt-1 w-full rounded-md border border-staff-line bg-staff-bg px-3 py-2 text-sm text-staff-text"
                    />
                  </div>
                </div>

                <button className="rounded-md bg-staff-accent px-5 py-2.5 text-sm font-medium text-staff-bg hover:opacity-90 transition-opacity">
                  Save interview
                </button>
              </form>
            </div>
          ) : null}

          {/* Final decision */}
          {can(staff.role, "decide") || candidate.decisions[0] ? (
            <div className="rounded-lg border border-staff-line p-6">
              <h2 className="font-serif text-2xl text-staff-strong">Final decision</h2>
              <p className="mt-2 mb-4 text-sm text-staff-muted">
                The score is a view, not the decision. Record the outcome and why.
              </p>
              {candidate.decisions[0] ? (
                <div className="text-sm text-staff-body">
                  <p className="text-staff-strong">
                    {recommendationLabel(candidate.decisions[0].outcome)}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap">{candidate.decisions[0].rationale}</p>
                  <p className="mt-3 text-xs text-staff-muted">
                    By {candidate.decisions[0].decidedBy.name}
                  </p>
                </div>
              ) : can(staff.role, "decide") ? (
                <form action={recordDecision} className="space-y-4">
                  <input type="hidden" name="attemptId" value={attempt.id} />
                  <input type="hidden" name="candidateId" value={candidate.id} />
                  <div>
                    <label className="text-xs uppercase tracking-[0.14em] text-staff-muted font-medium">
                      Outcome
                    </label>
                    <select
                      name="outcome"
                      required
                      className="mt-1 w-full rounded-md border border-staff-line bg-staff-bg px-3 py-2 text-sm text-staff-text"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Choose outcome
                      </option>
                      <option value="STRONG_HIRE">Strong Hire</option>
                      <option value="HIRE">Hire</option>
                      <option value="HOLD">Hold / Further Check</option>
                      <option value="NO_HIRE">No Hire</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.14em] text-staff-muted font-medium">
                      Decision rationale & remaining risks
                    </label>
                    <textarea
                      name="rationale"
                      required
                      placeholder="Why this decision, including remaining risks"
                      rows={5}
                      className="mt-1 w-full rounded-md border border-staff-line bg-staff-bg px-3 py-2 text-sm text-staff-text"
                    />
                  </div>
                  <button className="rounded-md bg-staff-strong px-5 py-2.5 text-sm font-medium text-staff-bg hover:opacity-90 transition-opacity">
                    Record decision
                  </button>
                </form>
              ) : (
                <p className="text-sm text-staff-muted">Pending hiring manager decision.</p>
              )}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
