import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { recommendationLabel } from "@/lib/scoring";
import { CopyLink } from "@/components/CopyLink";
import { ResponseView } from "@/components/ResponseView";
import { recordDecision, saveEvaluation, saveInterview } from "@/lib/actions";
import { requireStaff } from "@/lib/access";
import { can } from "@/lib/permissions";

const INTERVIEW_PROBES = [
  "A requirement changes halfway through a task and some previous work may now be wrong. What do you do in the first 10 minutes?",
  "You are behind target but quality has started falling. How do you decide what to do?",
  "Tell me how you would handle a problem where you do not know the answer and your first attempt fails.",
  "You used AI and received a confident answer that looked wrong. How would you verify it?",
  "If you joined a project tomorrow and knew nothing about the work, what would you do first?",
];

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const staff = await requireStaff("viewCandidates");
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: {
      invites: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { assessmentVersion: true },
      },
      decisions: { include: { decidedBy: true }, orderBy: { createdAt: "desc" } },
      attempts: {
        orderBy: { startedAt: "desc" },
        take: 1,
        include: {
          interview: true,
          evaluations: true,
          responses: { include: { task: true } },
          assessmentVersion: {
            include: {
              tasks: { orderBy: { sequence: "asc" } },
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

  const host = (await headers()).get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const invite = candidate.invites[0];
  const inviteUrl = invite ? `${protocol}://${host}/a/${invite.token}` : "";
  const attempt = candidate.attempts[0];
  const competencies =
    attempt?.assessmentVersion.assessment.roleVersion.competencies ?? [];
  const lowScores = attempt?.evaluations.filter((item) => item.score <= 3) ?? [];
  const focusProbes =
    lowScores.length > 0 ? INTERVIEW_PROBES.slice(0, 3) : INTERVIEW_PROBES.slice(0, 2);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/console/candidates" className="text-sm text-[#d9784a]">
          All candidates
        </Link>
        <p className="mt-4 text-xs uppercase tracking-[0.2em] text-[#9aa392]">
          Candidate
        </p>
        <h1 className="mt-2 font-serif text-4xl text-[#f3efe6]">{candidate.name}</h1>
        <p className="mt-2 text-sm text-[#c8cdb8]">
          {candidate.email} · {candidate.status.replace("_", " ")}
          {invite?.assessmentVersion
            ? ` · paper v${invite.assessmentVersion.version}`
            : ""}
        </p>
        {can(staff.role, "editAssessment") ? (
          <Link
            href={`/console/candidates/${candidate.id}/tasks`}
            className="mt-4 inline-flex text-sm text-[#d9784a]"
          >
            View or customize this person’s tasks
          </Link>
        ) : null}
      </div>

      {inviteUrl && can(staff.role, "invite") ? (
        <section className="rounded-lg border border-[#2a332a] p-5">
          <h2 className="font-serif text-xl text-[#f3efe6]">Assessment link</h2>
          <p className="mt-2 mb-4 text-sm text-[#9aa392]">
            Send this private link. It does not show scores or competencies.
          </p>
          <CopyLink url={inviteUrl} />
        </section>
      ) : null}

      {attempt?.overallScore != null ? (
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-[#2a332a] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[#9aa392]">Overall</p>
            <p className="mt-1 font-serif text-3xl text-[#f3efe6]">{attempt.overallScore}</p>
          </div>
          <div className="rounded-lg border border-[#2a332a] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[#9aa392]">System view</p>
            <p className="mt-1 font-serif text-2xl text-[#f3efe6]">
              {attempt.recommendation ? recommendationLabel(attempt.recommendation) : "—"}
            </p>
          </div>
          <div className="rounded-lg border border-[#2a332a] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[#9aa392]">Human decision</p>
            <p className="mt-1 font-serif text-2xl text-[#f3efe6]">
              {candidate.decisions[0]
                ? recommendationLabel(candidate.decisions[0].outcome)
                : "Pending"}
            </p>
          </div>
        </section>
      ) : null}

      {attempt ? (
        <section className="space-y-4">
          <h2 className="font-serif text-2xl text-[#f3efe6]">Submitted work</h2>
          {attempt.assessmentVersion.tasks.map((task) => {
            const response = attempt.responses.find((item) => item.taskId === task.id);
            return (
              <article key={task.id} className="rounded-lg border border-[#2a332a] p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-[#9aa392]">
                  Task {task.sequence}
                </p>
                <h3 className="mt-1 font-serif text-xl text-[#f3efe6]">{task.title}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-[#9aa392]">{task.instructions}</p>
                <div className="mt-4 border-t border-[#2a332a] pt-4">
                  {response ? (
                    <ResponseView
                      family={task.family}
                      contentJson={response.contentJson}
                      resourceLogJson={response.resourceLogJson}
                    />
                  ) : (
                    <p className="text-sm text-[#9aa392]">No response saved.</p>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <p className="text-sm text-[#9aa392]">The candidate has not started yet.</p>
      )}

      {attempt && attempt.status === "SUBMITTED" && can(staff.role, "score") ? (
        <section className="rounded-lg border border-[#2a332a] p-5">
          <h2 className="font-serif text-2xl text-[#f3efe6]">Score competencies</h2>
          <p className="mt-2 mb-6 text-sm text-[#9aa392]">
            5 is exceptional, 3 is acceptable, 1 is poor. The overall score is calculated
            from the role weights, not typed in by hand.
          </p>
          <form action={saveEvaluation} className="space-y-6">
            <input type="hidden" name="attemptId" value={attempt.id} />
            <input type="hidden" name="candidateId" value={candidate.id} />
            {competencies.map((competency) => {
              const existing = attempt.evaluations.find(
                (item) => item.competencyId === competency.id,
              );
              return (
                <div key={competency.id} className="border-b border-[#2a332a] pb-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-[#f3efe6]">{competency.name}</h3>
                    <p className="text-xs text-[#9aa392]">Weight {competency.weight}%</p>
                  </div>
                  <p className="mt-1 text-sm text-[#c8cdb8]">{competency.definition}</p>
                  <p className="mt-2 text-xs text-[#9aa392]">
                    5: {competency.exceptional} · 3: {competency.acceptable} · 1: {competency.poor}
                  </p>
                  <div className="mt-3 flex gap-3">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <label key={score} className="flex items-center gap-1 text-sm">
                        <input
                          type="radio"
                          name={`score-${competency.id}`}
                          value={score}
                          defaultChecked={existing?.score === score}
                          required
                        />
                        {score}
                      </label>
                    ))}
                  </div>
                  <textarea
                    name={`rationale-${competency.id}`}
                    defaultValue={existing?.rationale}
                    placeholder="Evidence for this score"
                    className="mt-3 w-full rounded-md border border-[#2a332a] bg-[#121612] px-3 py-2 text-sm text-[#e7eadf]"
                    rows={3}
                  />
                </div>
              );
            })}
            <button className="rounded-md bg-[#d9784a] px-4 py-2.5 text-sm font-medium text-[#121612]">
              Save scores
            </button>
          </form>
        </section>
      ) : null}

      {attempt?.overallScore != null &&
      (can(staff.role, "interview") || can(staff.role, "decide")) ? (
        <section className="grid gap-6 lg:grid-cols-2">
          {can(staff.role, "interview") ? (
            <div className="rounded-lg border border-[#2a332a] p-5">
              <h2 className="font-serif text-2xl text-[#f3efe6]">Interview notes</h2>
              <p className="mt-2 mb-4 text-sm text-[#9aa392]">
                Do not repeat the assessment. Use these to check remaining uncertainty.
              </p>
              <ul className="mb-4 list-disc space-y-2 pl-5 text-sm text-[#c8cdb8]">
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
                  className="w-full rounded-md border border-[#2a332a] bg-[#121612] px-3 py-2 text-sm"
                />
                <textarea
                  name="notes"
                  defaultValue={attempt.interview?.notes}
                  placeholder="Interview notes"
                  rows={5}
                  className="w-full rounded-md border border-[#2a332a] bg-[#121612] px-3 py-2 text-sm"
                />
                <button className="rounded-md border border-[#d9784a] px-4 py-2 text-sm text-[#d9784a]">
                  Save interview
                </button>
              </form>
            </div>
          ) : null}
          {can(staff.role, "decide") || candidate.decisions[0] ? (
            <div className="rounded-lg border border-[#2a332a] p-5">
              <h2 className="font-serif text-2xl text-[#f3efe6]">Final decision</h2>
              <p className="mt-2 mb-4 text-sm text-[#9aa392]">
                The score is a view, not the decision. Record the outcome and why.
              </p>
              {candidate.decisions[0] ? (
                <div className="text-sm text-[#c8cdb8]">
                  <p className="text-[#f3efe6]">
                    {recommendationLabel(candidate.decisions[0].outcome)}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap">{candidate.decisions[0].rationale}</p>
                  <p className="mt-3 text-xs text-[#9aa392]">
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
                    className="w-full rounded-md border border-[#2a332a] bg-[#121612] px-3 py-2 text-sm"
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
                    className="w-full rounded-md border border-[#2a332a] bg-[#121612] px-3 py-2 text-sm"
                  />
                  <button className="rounded-md bg-[#f3efe6] px-4 py-2.5 text-sm font-medium text-[#121612]">
                    Record decision
                  </button>
                </form>
              ) : (
                <p className="text-sm text-[#9aa392]">Pending hiring manager decision.</p>
              )}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
