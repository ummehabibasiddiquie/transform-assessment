import { prisma } from "./db";
import { anthropicApiKey } from "./env";
import { parseJson } from "./json";
import { isAutoMarked } from "./module-score";

const MODEL = "claude-sonnet-5-5";

export type DraftScore = {
  competencyId: string;
  score: number;
  rationale: string;
};

export type DraftMark = {
  taskId: string;
  mark: number;
  reason: string;
};

type AnswerRow = {
  sequence: number;
  title: string;
  instructions: string;
  evidenceNotes: string;
  answerKey: string;
  needsMark: boolean;
  answer: string;
};

const MARK_VALUES: Record<string, number> = { CORRECT: 1, PARTLY: 0.5, WRONG: 0 };

type CompetencyRow = {
  id: string;
  name: string;
  definition: string;
  weight: number;
  exceptional: string;
  acceptable: string;
  poor: string;
};

export async function saveClaudeDraft(attemptId: string, evaluatorId: string) {
  const { scores: drafts, marks } = await scoreAttemptWithClaude(attemptId);
  for (const mark of marks) {
    await prisma.taskMark.upsert({
      where: { attemptId_taskId: { attemptId, taskId: mark.taskId } },
      create: { attemptId, taskId: mark.taskId, aiMark: mark.mark, aiReason: mark.reason },
      update: { aiMark: mark.mark, aiReason: mark.reason },
    });
  }
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      assessmentVersion: {
        include: {
          assessment: { include: { roleVersion: { include: { competencies: true } } } },
        },
      },
    },
  });
  if (!attempt) throw new Error("Attempt not found.");
  void evaluatorId;
  const competencies = attempt.assessmentVersion.assessment.roleVersion.competencies;
  const names = new Map(competencies.map((item) => [item.id, item.name]));
  for (const draft of drafts) {
    await prisma.aiSuggestion.upsert({
      where: { attemptId_competencyId: { attemptId, competencyId: draft.competencyId } },
      create: {
        attemptId,
        competencyId: draft.competencyId,
        score: draft.score,
        rationale: draft.rationale,
      },
      update: {
        score: draft.score,
        rationale: draft.rationale,
      },
    });
  }
  return {
    overall: null,
    recommendation: null,
    scores: drafts.map((draft) => ({
      name: names.get(draft.competencyId) ?? draft.competencyId,
      score: draft.score,
      rationale: draft.rationale,
    })),
  };
}

export async function scoreAttemptWithClaude(
  attemptId: string,
): Promise<{ scores: DraftScore[]; marks: DraftMark[] }> {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      responses: { include: { task: true } },
      assessmentVersion: {
        include: {
          tasks: { orderBy: { sequence: "asc" }, include: { key: true } },
          assessment: {
            include: { roleVersion: { include: { competencies: { orderBy: { sortOrder: "asc" } } } } },
          },
        },
      },
    },
  });
  if (!attempt) throw new Error("Attempt not found.");
  if (attempt.status !== "SUBMITTED") {
    throw new Error("Claude can score a test only after the candidate submits it.");
  }

  const competencies = attempt.assessmentVersion.assessment.roleVersion.competencies;
  const answers: AnswerRow[] = attempt.assessmentVersion.tasks.map((task) => {
    const response = attempt.responses.find((item) => item.taskId === task.id);
    const key = [task.key?.answerKey, task.key?.rubric].filter(Boolean).join("\n");
    return {
      sequence: task.sequence,
      title: task.title,
      instructions: clip(task.instructions, 4000),
      evidenceNotes: clip(task.evidenceNotes, 2000),
      answerKey: clip(key, 2000),
      needsMark: !isAutoMarked(task),
      answer: clip(flattenAnswer(response?.contentJson, response?.resourceLogJson), 6000),
    };
  });
  if (answers.every((item) => !item.answer.trim())) {
    throw new Error("This candidate has no saved answers to score.");
  }

  const text = await callClaude(buildPrompt(competencies, answers));
  const bySequence = new Map(attempt.assessmentVersion.tasks.map((task) => [task.sequence, task.id]));
  return {
    scores: parseScores(text, competencies),
    marks: parseMarks(text, answers, bySequence),
  };
}

function buildPrompt(competencies: CompetencyRow[], answers: AnswerRow[]) {
  const rubric = competencies
    .map(
      (item) =>
        `${item.name} | weight ${item.weight}\nDefinition: ${item.definition}\n5: ${item.exceptional}\n3: ${item.acceptable}\n1: ${item.poor}`,
    )
    .join("\n\n");
  const work = answers
    .map((item) =>
      [
        `Task ${item.sequence}${item.needsMark ? " [MARK]" : ""}: ${item.title}`,
        `Instructions: ${item.instructions}`,
        `What to look for: ${item.evidenceNotes || "Use the competency rubric."}`,
        item.answerKey ? `Answer key (evaluator only): ${item.answerKey}` : "",
        `Candidate answer:\n${item.answer || "(no answer)"}`,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n---\n\n");
  const toMark = answers.filter((item) => item.needsMark).map((item) => item.sequence);

  return `Score this assessment. Use only the candidate's answers, the answer keys, and the rubric. Do not decide hire or no hire.

1. Competencies: 5 is exceptional, 3 is acceptable, 1 is poor. Use 2 and 4 when the answer sits between those descriptions. A missing or empty answer is 1.
2. Marks: for every task labelled [MARK] (tasks ${toMark.join(", ") || "none"}), compare the answer with its answer key and give CORRECT, PARTLY, or WRONG. CORRECT means it covers the key points of the answer key. PARTLY means some key points are right but important ones are missing or wrong. WRONG means it misses the key points, contradicts the key, or is empty.

Return JSON only, with one entry for every competency name copied exactly, and one entry for every [MARK] task:
{"scores":[{"name":"Adaptability","score":3,"rationale":"One or two sentences citing the answer."}],"marks":[{"task":21,"mark":"PARTLY","reason":"One sentence on what matched or was missing."}]}

Competencies:
${rubric}

Candidate work:
${work}`;
}

function parseMarks(text: string, answers: AnswerRow[], bySequence: Map<number, string>): DraftMark[] {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) return [];
  const parsed = parseJson<{ marks?: { task?: number | string; mark?: string; reason?: string }[] }>(
    text.slice(start, end + 1),
    {},
  );
  const wanted = new Set(answers.filter((item) => item.needsMark).map((item) => item.sequence));
  const marks: DraftMark[] = [];
  for (const row of parsed.marks ?? []) {
    const sequence = Number(String(row.task ?? "").replace(/\D/g, ""));
    const value = MARK_VALUES[String(row.mark ?? "").trim().toUpperCase()];
    const taskId = bySequence.get(sequence);
    if (!wanted.has(sequence) || value == null || !taskId) continue;
    marks.push({ taskId, mark: value, reason: String(row.reason ?? "").trim().slice(0, 1000) });
  }
  return marks;
}

async function callClaude(prompt: string) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": anthropicApiKey(),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      thinking: { type: "between_tools" },
      output_config: { effort: "medium" },
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const body = (await response.json()) as {
    error?: { message?: string };
    content?: { type: string; text?: string }[];
  };
  if (!response.ok) {
    throw new Error(body.error?.message || "Claude could not score this test.");
  }
  const text = (body.content ?? [])
    .filter((block) => block.type === "text" && block.text)
    .map((block) => block.text)
    .join("\n")
    .trim();
  if (!text) throw new Error("Claude returned no score.");
  return text;
}

function parseScores(text: string, competencies: CompetencyRow[]): DraftScore[] {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Claude did not return scores.");
  const parsed = parseJson<{
    scores?: { name?: string; competencyId?: string; score?: number; rationale?: string }[];
  }>(text.slice(start, end + 1), {});
  const rows = parsed.scores ?? [];
  return competencies.map((competency) => {
    const row = rows.find((item) => {
      const name = String(item.name ?? "").trim().toLowerCase();
      return item.competencyId === competency.id || name === competency.name.trim().toLowerCase();
    });
    const score = Number(row?.score);
    if (!row || !Number.isInteger(score) || score < 1 || score > 5) {
      throw new Error(`Claude did not score ${competency.name}.`);
    }
    return {
      competencyId: competency.id,
      score,
      rationale: String(row.rationale ?? "").trim().slice(0, 2000),
    };
  });
}

function flattenAnswer(contentJson?: string, resourceLogJson?: string) {
  const content = flatten(parseJson(contentJson || "{}", {}));
  const log = flatten(parseJson(resourceLogJson || "{}", {}));
  return [content, log ? `Tools and checks:\n${log}` : ""].filter(Boolean).join("\n");
}

function flatten(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => flatten(item)).filter(Boolean).join("\n");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => {
        const text = flatten(item);
        return text ? `${key}: ${text}` : "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

function clip(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}\n…`;
}
