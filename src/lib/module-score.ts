import { parseJson } from "./json";

type TaskRow = {
  id: string;
  module: string;
  responseType: string;
  isGate: boolean;
  title: string;
  key?: { answerKey: string } | null;
};

type ResponseRow = { taskId: string; contentJson: string };

export type ModuleScore = {
  label: string;
  correct: number;
  scored: number;
  total: number;
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

function scoreModule(label: string, tasks: TaskRow[], responses: ResponseRow[]): ModuleScore {
  let correct = 0;
  let scored = 0;
  for (const task of tasks) {
    const response = responses.find((item) => item.taskId === task.id);
    const matched = answerMatches(task.responseType, response?.contentJson ?? "{}", task.key?.answerKey ?? "");
    if (matched == null) continue;
    scored += 1;
    if (matched) correct += 1;
  }
  return {
    label,
    correct,
    scored,
    total: tasks.length,
    percent: scored > 0 ? Math.round((correct / scored) * 100) : null,
  };
}

export function scoreModules(tasks: TaskRow[], responses: ResponseRow[]) {
  return {
    aptitude: scoreModule(
      "Aptitude and reasoning",
      tasks.filter((task) => task.module === "COMMON_APTITUDE"),
      responses,
    ),
    problemSolving: scoreModule(
      "Problem solving",
      tasks.filter((task) => task.module === "COMMON_PROBLEM_SOLVING"),
      responses,
    ),
    role: scoreModule(
      "Role-specific",
      tasks.filter((task) => task.module === "ROLE"),
      responses,
    ),
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
