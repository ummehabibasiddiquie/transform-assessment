import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { recommendationLabel } from "@/lib/scoring";
import { gateResults, scoreModules } from "@/lib/module-score";
import { CollapsibleList } from "@/components/CollapsibleList";
import { CopyLink } from "@/components/CopyLink";
import { SubmittedWorkPanel } from "@/components/SubmittedWorkPanel";
import {
  recordDecision,
  runAutoEvaluation,
  saveEvaluation,
  saveGateReviews,
  saveInterview,
  saveUncertainties,
} from "@/lib/actions";
import { GATE_STATUSES, gateRules } from "@/lib/gates";
import { bandFor, bandsForRole } from "@/lib/bands";
import { readEvidenceKeys } from "@/lib/competency-evidence";
import { CompetencyEvidence } from "@/components/CompetencyEvidence";
import { SubmitButton } from "@/components/SubmitButton";
import { appUrl } from "@/lib/env";
import { requireStaff } from "@/lib/access";
import { can } from "@/lib/permissions";

export const maxDuration = 60;

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
  searchParams: Promise<{ auto?: string }>;
}) {
  const { id } = await params;
  const { auto = "" } = await searchParams;
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
  const systemBand =
    attempt?.overallScore != null && roleBands ? bandFor(attempt.overallScore, roleBands.bands) : null;
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
          <h2 className="font-serif text-xl text-staff-strong">Assessment link</h2>
          <p className="mt-2 mb-4 text-sm text-staff-muted">
            Send this private link. It does not show scores or competencies.
          </p>
          <CopyLink url={inviteUrl} />
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
          {Object.values(scoreModules(attempt.assessmentVersion.tasks, attempt.responses)).map(
            (score) => (
              <div key={score.label} className="rounded-lg border border-staff-line p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-staff-muted">{score.label}</p>
                <p className="mt-1 font-serif text-3xl text-staff-strong">
                  {score.percent == null ? "—" : `${score.percent}%`}
                </p>
                <p className="mt-1 text-xs text-staff-muted">
                  {score.scored > 0
                    ? `${score.correct} of ${score.scored} scored · ${score.total} tasks`
                    : `${score.total} tasks for review`}
                </p>
              </div>
            ),
          )}
        </section>
      ) : null}

      {attempt && attempt.status === "SUBMITTED" && gates.length > 0 ? (
        <section className="rounded-lg border border-staff-line p-5">
          <h2 className="font-serif text-xl text-staff-strong">Critical gates</h2>
          <p className="mt-2 text-sm text-staff-muted">
            Mark each gate for this role. A failed gate is a warning for the hiring decision.
            It does not record the decision.
          </p>
          {failedGates.length > 0 ? (
            <div className="mt-4 rounded-md border border-staff-accent p-3 text-sm text-staff-text">
              <p className="font-medium text-staff-accent">
                Critical gate failed: {failedGates.map((gate) => gate.name).join(", ")}
              </p>
              {failedGates.map((gate) =>
                gate.effect ? (
                  <p key={gate.name} className="mt-1">
                    {gate.name}: workbook guidance is “{gate.effect}”.
                  </p>
                ) : null,
              )}
            </div>
          ) : null}
          {gateTasks.length > 0 ? (
            <div className="mt-4 text-sm text-staff-body">
              <p className="text-xs uppercase tracking-[0.14em] text-staff-muted">
                Tasks to check for these gates
              </p>
              <ul className="mt-1 space-y-1">
                {gateTasks.map((task) => (
                  <li key={task.title}>
                    {task.title}: {task.status}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <form action={saveGateReviews} className="mt-4 space-y-4">
            <input type="hidden" name="attemptId" value={attempt.id} />
            <input type="hidden" name="candidateId" value={candidate.id} />
            <input type="hidden" name="gateCount" value={gates.length} />
            {gates.map((gate, index) => {
              const review = attempt.gateReviews.find((item) => item.gate === gate.name);
              return (
                <div key={gate.name} className="border-b border-staff-line pb-4">
                  <input type="hidden" name={`gate-name-${index}`} value={gate.name} />
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h3 className="text-staff-strong">{gate.name}</h3>
                    <div className="flex gap-4 text-sm">
                      {GATE_STATUSES.map((status) => (
                        <label key={status.value} className="flex items-center gap-1.5">
                          <input
                            type="radio"
                            name={`gate-status-${index}`}
                            value={status.value}
                            defaultChecked={review?.status === status.value}
                            disabled={!canScore}
                          />
                          {status.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  {gate.trigger ? (
                    <p className="mt-1 text-xs text-staff-muted">
                      Fails when: {gate.trigger} · Guidance: {gate.effect}
                    </p>
                  ) : null}
                  <input
                    name={`gate-note-${index}`}
                    defaultValue={review?.note}
                    placeholder="Evidence, if Concern or Fail"
                    disabled={!canScore}
                    className="mt-2 w-full rounded-md border border-staff-line bg-staff-bg px-3 py-1.5 text-sm text-staff-text disabled:opacity-60"
                  />
                </div>
              );
            })}
            {canScore ? (
              <button className="rounded-md border border-staff-accent px-4 py-2 text-sm text-staff-accent">
                Save gates
              </button>
            ) : null}
          </form>
        </section>
      ) : null}

      {attempt?.overallScore != null ? (
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-staff-line p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-staff-muted">Overall</p>
            <p className="mt-1 font-serif text-3xl text-staff-strong">{attempt.overallScore}</p>
          </div>
          <div className="rounded-lg border border-staff-line p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-staff-muted">System view</p>
            <p className="mt-1 font-serif text-2xl text-staff-strong">
              {systemBand ? recommendationLabel(systemBand.recommendation) : "—"}
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

      {attempt && attempt.status === "SUBMITTED" && can(staff.role, "score") ? (
        <section className="rounded-lg border border-staff-line p-5">
          <h2 className="font-serif text-2xl text-staff-strong">Score competencies</h2>
          <p className="mt-2 text-sm text-staff-muted">
            5 is exceptional, 3 is acceptable, 1 is poor. The overall score is calculated
            from the role weights, not typed in by hand.
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
              Claude filled the score boxes below. Change anything that looks wrong, then save.
              Saving records the human scores. It does not record Hire or No Hire.
            </p>
          ) : auto ? (
            <p className="mt-3 text-sm text-staff-accent">{auto}</p>
          ) : (
            <p className="mt-3 text-sm text-staff-muted">
              Score with Claude fills the boxes from the answers. You can edit them, then save.
            </p>
          )}
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

      {attempt?.overallScore != null &&
      (can(staff.role, "interview") || can(staff.role, "decide")) ? (
        <section className="grid gap-6 lg:grid-cols-2">
          {can(staff.role, "interview") ? (
            <div className="rounded-lg border border-staff-line p-5">
              <h2 className="font-serif text-2xl text-staff-strong">Interview notes</h2>
              <p className="mt-2 mb-4 text-sm text-staff-muted">
                Do not repeat the assessment. Use these to check remaining uncertainty.
              </p>
              {attempt.uncertainties ? (
                <div className="mb-4 rounded-md border border-staff-line p-3 text-sm">
                  <p className="text-xs uppercase tracking-[0.14em] text-staff-muted">
                    Still unclear from the test
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-staff-text">{attempt.uncertainties}</p>
                </div>
              ) : null}
              <ul className="mb-4 list-disc space-y-2 pl-5 text-sm text-staff-body">
                {focusProbes.map((probe) => (
                  <li key={probe}>{probe}</li>
                ))}
              </ul>
              <form action={saveInterview} className="space-y-3">
                <input type="hidden" name="attemptId" value={attempt.id} />
                <input type="hidden" name="candidateId" value={candidate.id} />
                <textarea
                  name="probesUsed"
                  defaultValue={attempt.interview?.probesUsed}
                  placeholder="Which probes you actually used"
                  rows={2}
                  className="w-full rounded-md border border-staff-line bg-staff-bg px-3 py-2 text-sm"
                />
                <textarea
                  name="notes"
                  defaultValue={attempt.interview?.notes}
                  placeholder="Interview notes"
                  rows={5}
                  className="w-full rounded-md border border-staff-line bg-staff-bg px-3 py-2 text-sm"
                />
                <button className="rounded-md border border-staff-accent px-4 py-2 text-sm text-staff-accent">
                  Save interview
                </button>
              </form>
            </div>
          ) : null}
          {can(staff.role, "decide") || candidate.decisions[0] ? (
            <div className="rounded-lg border border-staff-line p-5">
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
                <form action={recordDecision} className="space-y-3">
                  <input type="hidden" name="attemptId" value={attempt.id} />
                  <input type="hidden" name="candidateId" value={candidate.id} />
                  <select
                    name="outcome"
                    required
                    className="w-full rounded-md border border-staff-line bg-staff-bg px-3 py-2 text-sm"
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
                  <textarea
                    name="rationale"
                    required
                    placeholder="Why this decision, including remaining risks"
                    rows={5}
                    className="w-full rounded-md border border-staff-line bg-staff-bg px-3 py-2 text-sm"
                  />
                  <button className="rounded-md bg-staff-strong px-4 py-2.5 text-sm font-medium text-staff-bg">
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
