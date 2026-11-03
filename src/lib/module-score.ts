import { parseJson } from "./json";
import { responseHasAnswer } from "./question-shape";

type TaskRow = {
  id: string;
  module: string;
  responseType: string;
  isGate: boolean;
  title: string;
  key?: { answerKey: string } | null;
};

type ResponseRow = { taskId: string; contentJson: string };

export type MarkRow = { taskId: string; mark?: number | null; aiMark?: number | null };

function appliedMark(row: MarkRow | undefined) {
  if (row?.mark != null) return row.mark;
  if (row?.aiMark != null) return row.aiMark;
  return null;
}

export type ModuleScore = {
  label: string;
  correct: number;
  scored: number;
  total: number;
  answered: number;
  manual: number;
  marked: number;
  points: number;
  percent: number | null;
};

function answerMatches(responseType: string, contentJson: string, answerKey: string) {
  const content = parseJson<Record<string, unknown>>(contentJson, {});
  const key = answerKey.trim().toLowerCase();
  if (!key) return null;
  if (responseType === "MCQ" || responseType === "NUMERIC") {
    const value = String(content.choice ?? content.value ?? content.answer ?? "")
      .trim()
      .toLowerCase();
    if (!value) return false;
    return value === key;
  }
  if (responseType === "MULTI_SELECT") {
    const selected = Array.isArray(content.selected) ? content.selected.map(String) : [];
    const expected = key
      .split(/[,|]/)
      .map((part) => part.trim())
      .filter(Boolean)
      .sort();
    return selected.map((item) => item.toLowerCase()).sort().join(",") === expected.join(",");
  }
  return null;
}

export const MARK_OPTIONS = [
  { value: 1, label: "Correct" },
  { value: 0.5, label: "Partly" },
  { value: 0, label: "Wrong" },
] as const;

export function isAutoMarked(task: Pick<TaskRow, "responseType" | "key">) {
  return (
    ["MCQ", "NUMERIC", "MULTI_SELECT"].includes(task.responseType) &&
    Boolean(task.key?.answerKey.trim())
  );
}

function scoreModule(
  label: string,
  tasks: TaskRow[],
  responses: ResponseRow[],
  marks: MarkRow[],
): ModuleScore {
  let correct = 0;
  let scored = 0;
  let answered = 0;
  let marked = 0;
  let manualPoints = 0;
  for (const task of tasks) {
    const response = responses.find((item) => item.taskId === task.id);
    if (response && responseHasAnswer(response.contentJson)) answered += 1;
    const matched = answerMatches(task.responseType, response?.contentJson ?? "{}", task.key?.answerKey ?? "");
    if (matched == null) {
      const mark = appliedMark(marks.find((item) => item.taskId === task.id));
      if (mark != null) {
        marked += 1;
        manualPoints += mark;
      }
      continue;
    }
    scored += 1;
    if (matched) correct += 1;
  }
  return {
    label,
    correct,
    scored,
    total: tasks.length,
    answered,
    manual: tasks.length - scored,
    marked,
    points: correct + manualPoints,
    percent: scored > 0 ? Math.round((correct / scored) * 100) : null,
  };
}

export function scoreModules(tasks: TaskRow[], responses: ResponseRow[], marks: MarkRow[] = []) {
  return {
    aptitude: scoreModule(
      "Part 1 · Aptitude and reasoning",
      tasks.filter((task) => task.module === "COMMON_APTITUDE"),
      responses,
      marks,
    ),
    problemSolving: scoreModule(
      "Part 2 · Problem solving",
      tasks.filter((task) => task.module === "COMMON_PROBLEM_SOLVING"),
      responses,
      marks,
    ),
    role: scoreModule(
      "Part 3 · Role-specific",
      tasks.filter((task) => task.module === "ROLE"),
      responses,
      marks,
    ),
  };
}

export type TestTotals = {
  points: number;
  total: number;
  toMark: number;
  percent: number | null;
  complete: boolean;
};

export function testTotals(tasks: TaskRow[], responses: ResponseRow[], marks: MarkRow[]): TestTotals {
  const parts = Object.values(scoreModules(tasks, responses, marks));
  const points = parts.reduce((sum, part) => sum + part.points, 0);
  const total = parts.reduce((sum, part) => sum + part.total, 0);
  const toMark = parts.reduce((sum, part) => sum + (part.manual - part.marked), 0);
  return {
    points,
    total,
    toMark,
    percent: total > 0 ? Math.round((points / total) * 1000) / 10 : null,
    complete: toMark === 0,
  };
}

export function gateResults(tasks: TaskRow[], responses: ResponseRow[]) {
  return tasks
    .filter((task) => task.isGate)
    .map((task) => {
      const response = responses.find((item) => item.taskId === task.id);
      const matched = answerMatches(
        task.responseType,
        response?.contentJson ?? "{}",
        task.key?.answerKey ?? "",
      );
      const status = matched == null ? "Needs review" : matched ? "Passed" : "Failed";
      return { title: task.title, status };
    });
}
