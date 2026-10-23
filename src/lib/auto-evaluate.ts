import { prisma } from "./db";
import { anthropicApiKey } from "./env";
import { parseJson } from "./json";

const MODEL = "claude-sonnet-5-5";

export type DraftScore = {
  competencyId: string;
  score: number;
  rationale: string;
};

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
  const drafts = await scoreAttemptWithClaude(attemptId);
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

export async function scoreAttemptWithClaude(attemptId: string): Promise<DraftScore[]> {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      responses: { include: { task: true } },
      assessmentVersion: {
        include: {
          tasks: { orderBy: { sequence: "asc" } },
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
  const answers = attempt.assessmentVersion.tasks.map((task) => {
    const response = attempt.responses.find((item) => item.taskId === task.id);
    return {
      title: task.title,
      instructions: clip(task.instructions, 4000),
      evidenceNotes: clip(task.evidenceNotes, 2000),
      answer: clip(flattenAnswer(response?.contentJson, response?.resourceLogJson), 6000),
    };
  });
  if (answers.every((item) => !item.answer.trim())) {
    throw new Error("This candidate has no saved answers to score.");
  }

  const text = await callClaude(buildPrompt(competencies, answers));
  return parseScores(text, competencies);
}

function buildPrompt(
  competencies: CompetencyRow[],
  answers: { title: string; instructions: string; evidenceNotes: string; answer: string }[],
) {
  const rubric = competencies
    .map(
      (item) =>
        `${item.name} | weight ${item.weight}\nDefinition: ${item.definition}\n5: ${item.exceptional}\n3: ${item.acceptable}\n1: ${item.poor}`,
    )
    .join("\n\n");
  const work = answers
    .map(
      (item, index) =>
        `Task ${index + 1}: ${item.title}\nInstructions: ${item.instructions}\nWhat to look for: ${item.evidenceNotes || "Use the competency rubric."}\nCandidate answer:\n${item.answer || "(no answer)"}`,
    )
    .join("\n\n---\n\n");

  return `Score this work simulation. Use only the candidate's answers and the rubric. 5 is exceptional, 3 is acceptable, 1 is poor. Use 2 and 4 when the answer sits between those descriptions. A missing or empty answer is 1. Do not decide hire or no hire.

Return JSON only, with one entry for every competency name, copied exactly:
{"scores":[{"name":"Adaptability","score":3,"rationale":"One or two sentences citing the answer."}]}

Competencies:
${rubric}

Candidate work:
${work}`;
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
      max_tokens: 4000,
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
